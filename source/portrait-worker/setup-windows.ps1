# ATSH AI workstation setup. Run as the signed-in Windows user, not as admin.
# Installs only missing prerequisites, then isolated CPU dependencies and official model files.
# No server credentials, no automatic production activation.
param([string]$Root = (Join-Path $env:LOCALAPPDATA 'ATSH-AI-Portrait'))
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Commit = 'cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8'
$WorkerCommit = 'd95399a6989bab11c36afaf6e79721375b50bf6a'
function Run([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
}
function Find-Command([string]$Name) {
    $c = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    return $null
}
function Install-Package([string]$Id) {
    $winget = Find-Command 'winget.exe'
    if (!$winget) { throw 'Windows Package Manager (winget) is missing. Install Microsoft App Installer first.' }
    Run $winget @('install','--id',$Id,'--exact','--source','winget','--accept-package-agreements','--accept-source-agreements')
    Refresh-Path
}
function Python310 {
    $launcher = Find-Command 'py.exe'
    if (!$launcher) {
        $candidate = Join-Path $env:LOCALAPPDATA 'Programs\Python\Launcher\py.exe'
        if (Test-Path $candidate) { $launcher = $candidate }
    }
    if ($launcher) {
        $p = & $launcher -3.10 -c 'import sys;print(sys.executable)' 2>$null
        if ($LASTEXITCODE -eq 0 -and $p -and (Test-Path $p)) { return "$p" }
    }
    return $null
}
function Download-Official([string]$Url, [string]$Target) {
    if ($Url -notmatch '^https://(github\.com|raw\.githubusercontent\.com)/') { throw 'Unexpected download origin' }
    if (Test-Path $Target) {
        if ((Get-Item $Target).Length -gt 0) { return }
        throw "Existing empty file: $Target. Rename it before retrying."
    }
    $part = "$Target.partial"
    if (Test-Path $part) { throw "Partial file exists: $part. Rename it before retrying." }
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $part
    if ((Get-Item $part).Length -le 0) { throw 'Empty download' }
    Move-Item -LiteralPath $part -Destination $Target
}
try {
    if (![Environment]::Is64BitOperatingSystem) { throw '64-bit Windows required' }
    $Root = [IO.Path]::GetFullPath($Root)
    $driveRoot = [IO.Path]::GetPathRoot($Root)
    $free = [IO.DriveInfo]::new($driveRoot).AvailableFreeSpace
    if ($free -lt 10GB) { throw 'At least 10 GB free disk space required. Choose a different Root.' }
    New-Item -ItemType Directory -Force -Path $Root | Out-Null
    Write-Host '1/5 Checking Windows prerequisites...'
    Refresh-Path
    $python = Python310
    if (!$python) { Install-Package 'Python.Python.3.10'; $python = Python310 }
    if (!$python) { throw 'Python 3.10 not found. Reopen PowerShell and retry.' }
    $git = Find-Command 'git.exe'
    if (!$git) { Install-Package 'Git.Git'; $git = Find-Command 'git.exe' }
    if (!$git) { throw 'Git not found. Reopen PowerShell and retry.' }
    $ffmpeg = Find-Command 'ffmpeg.exe'
    if (!$ffmpeg) { Install-Package 'Gyan.FFmpeg'; $ffmpeg = Find-Command 'ffmpeg.exe' }
    $ffprobe = Find-Command 'ffprobe.exe'
    if (!$ffmpeg -or !$ffprobe) { throw 'FFmpeg/FFprobe not found. Reopen PowerShell and retry.' }

    Write-Host '2/5 Fetching pinned official model source...'
    $model = Join-Path $Root 'SadTalker'
    if (!(Test-Path $model)) {
        Run $git @('clone','--no-checkout','https://github.com/OpenTalker/SadTalker.git',$model)
        Run $git @('-C',$model,'checkout','--detach',$Commit)
    } else {
        $head = & $git -C $model rev-parse HEAD
        if ($LASTEXITCODE -ne 0 -or "$head" -ne $Commit) { throw 'Unexpected existing model folder. Choose a new Root.' }
        $dirty = & $git -C $model status --porcelain --untracked-files=no
        if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Existing model source has tracked local changes. Choose a new Root.' }
    }
    $worker = Join-Path $Root 'worker.py'
    Download-Official "https://raw.githubusercontent.com/atsh-ai-new/atsh-ai-new/$WorkerCommit/source/portrait-worker/worker.py" $worker
    if (!(Test-Path (Join-Path $Root 'venv\Scripts\python.exe'))) {
        Run $python @('-m','venv',(Join-Path $Root 'venv'))
    }
    $venv = Join-Path $Root 'venv\Scripts\python.exe'

    Write-Host '3/5 Installing isolated CPU dependencies (large download)...'
    Run $venv @('-m','pip','install','--upgrade','pip','setuptools==69.5.1','wheel')
    Run $venv @('-m','pip','install','torch==2.6.0','torchvision==0.21.0','torchaudio==2.6.0','--index-url','https://download.pytorch.org/whl/cpu')
    # The CLI does not require the externally exposed Gradio demo.
    $req = Join-Path $Root 'requirements-cpu.txt'
    $requirements = Get-Content (Join-Path $model 'requirements.txt') | Where-Object { $_ -notmatch '^\s*gradio\s*$' }
    $requirements += @('numba==0.57.1','opencv-python==4.8.1.78','Pillow==9.5.0','gfpgan==1.3.8')
    Set-Content -LiteralPath $req -Value $requirements -Encoding ascii
    Run $venv @('-m','pip','install','--no-build-isolation','-r',$req)
    # BasicSR 1.4.2 imports an old torchvision module; adapt only that known import.
    $basic = Join-Path $Root 'venv\Lib\site-packages\basicsr\data\degradations.py'
    if (!(Test-Path $basic)) { throw 'Expected BasicSR file missing' }
    $source = [IO.File]::ReadAllText($basic)
    $old = 'from torchvision.transforms.functional_tensor import rgb_to_grayscale'
    $new = 'from torchvision.transforms.functional import rgb_to_grayscale'
    if ($source.Contains($old)) {
        [IO.File]::WriteAllText($basic,$source.Replace($old,$new),[Text.UTF8Encoding]::new($false))
    } elseif (!$source.Contains($new)) { throw 'Unexpected BasicSR version; stop for review.' }
    Run $venv @('-m','pip','check')

    Write-Host '4/5 Downloading only CPU portrait checkpoints...'
    $ck = Join-Path $model 'checkpoints'
    $weights = Join-Path $model 'gfpgan\weights'
    New-Item -ItemType Directory -Force -Path $ck,$weights | Out-Null
    $release = 'https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/'
    foreach ($name in @('SadTalker_V0.0.2_256.safetensors','mapping_00109-model.pth.tar')) {
        Download-Official ($release+$name) (Join-Path $ck $name)
    }
    foreach ($name in @('alignment_WFLW_4HG.pth','detection_Resnet50_Final.pth')) {
        Download-Official ('https://github.com/xinntao/facexlib/releases/download/v0.1.0/'+$name) (Join-Path $weights $name)
    }
    $env:TORCH_FORCE_WEIGHTS_ONLY_LOAD = '1'
    $env:OMP_NUM_THREADS = '2'
    $env:MKL_NUM_THREADS = '2'
    Push-Location $model
    try { Run $venv @('inference.py','--help') } finally { Pop-Location }

    Write-Host '5/5 Installation completed; real local test still required.'
    Write-Host "Worker: $worker"
    Write-Host "Model: $model"
    $photo = Read-Host 'Enter full path to a portrait you are authorized to animate (or Enter to skip)'
    if ($photo) {
        $photo = $photo.Trim('"')
        if (!(Test-Path -LiteralPath $photo -PathType Leaf)) { throw 'Photo not found' }
        Add-Type -AssemblyName System.Speech
        $speech = Join-Path $Root ('test-' + [Guid]::NewGuid().ToString('N') + '.wav')
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        try { $synth.SetOutputToWaveFile($speech); $synth.Speak('Hello. This is a local video test.'); $synth.SetOutputToNull() } finally { $synth.Dispose() }
        $result = Join-Path $Root ('test-' + [Guid]::NewGuid().ToString('N') + '.mp4')
        Run $venv @($worker,'--model-dir',$model,'--python',$venv,'--ffmpeg',$ffmpeg,'--ffprobe',$ffprobe,'--benchmark-image',$photo,'--benchmark-audio',$speech,'--benchmark-output',$result,'--benchmark-seconds','8')
        Write-Host "BENCHMARK_OK: $result"
    } else { Write-Host 'SETUP_OK - benchmark not run' }
    Write-Host 'Production activation is separate, after benchmark and license review. No token required for setup.'
} catch {
    Write-Error $_
    exit 1
}

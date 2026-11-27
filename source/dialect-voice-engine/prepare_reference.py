"""Local-only registration of consented candidate voices; never switches on a profile."""
import argparse, hashlib, json, os, subprocess, tempfile, wave
from pathlib import Path
from service import IDS,youth_voice

def digest_pcm(p):
    with wave.open(str(p),"rb") as w:
        if (w.getnchannels(),w.getsampwidth(),w.getframerate()) != (1,2,16000):
            raise ValueError("Expected mono PCM16 16 kHz")
        duration=w.getnframes()/16000
        pcm=w.readframes(w.getnframes())
        if not 5 <= duration <= 15:
            raise ValueError("Record 5–15 seconds of clear speech")
        from array import array
        samples=array("h",pcm)
        if max(map(abs,samples),default=0)<500:
            raise ValueError("Recording is silent or too quiet")
        return hashlib.sha256(pcm).hexdigest()

def prepare(root, voice_id, audio, transcript, consent_record, *, guardian_record=None, synthetic=False):
    root=Path(root).resolve()
    if voice_id not in IDS:
        raise ValueError("Unknown voice identity")
    transcript=transcript.strip()
    if not transcript or len(transcript)>500 or "<|" in transcript:
        raise ValueError("Exact spoken transcript required")
    consent_record=Path(consent_record).resolve()
    if not consent_record.is_file() or consent_record.stat().st_size<10:
        raise ValueError("Document the speaker's explicit commercial synthesis consent first")
    if youth_voice(voice_id) and not synthetic:
        if guardian_record is None or not Path(guardian_record).is_file() or Path(guardian_record).stat().st_size<10:
            raise ValueError("Youth reference requires documented guardian consent")
    manifest=root/"profiles.json"
    config=json.loads(manifest.read_text(encoding="utf-8"))
    if config.get(voice_id,{}).get("approved"):
        raise ValueError("Cannot replace a live character voice identity")
    # Never store names, consent records or raw input outside the private model directory.
    refs=root/"references";refs.mkdir(mode=0o750,exist_ok=True)
    if not refs.resolve().is_relative_to(root):raise ValueError("Unsafe reference directory")
    with tempfile.TemporaryDirectory(dir=refs) as tmp:
        wav=Path(tmp)/"normalized.wav"
        subprocess.run(["ffmpeg","-nostdin","-v","error","-i",str(Path(audio).resolve()),
                        "-vn","-ac","1","-ar","16000","-c:a","pcm_s16le","-t","16",str(wav)],check=True,timeout=30)
        identity=digest_pcm(wav)
        for id, item in config.items():
            ref=item.get("reference")
            if id!=voice_id and ref:
                other=(root/ref).resolve()
                if other.is_relative_to(root) and other.is_file() and digest_pcm(other)==identity:
                    raise ValueError("Recording already registered to another voice")
        relative=f"references/{voice_id}-{identity[:20]}.wav"
        dest=root/relative
        if not dest.exists():os.replace(wav,dest)
        config[voice_id]={"engine":"audar","model":"audar/Audar-TTS-V1-Flash-Q4_K_M.gguf",
                          "codec":"neucodec","reference":relative,"transcript":transcript,
                          "commercialRights":True,"approved":False,
                          "source":"synthetic" if synthetic else "human",
                          "guardianConsent":bool(guardian_record and not synthetic)}
        config_tmp=Path(tmp)/"profiles.json"
        config_tmp.write_text(json.dumps(config,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        os.chmod(config_tmp,0o640)
        os.replace(config_tmp,manifest)
    return relative

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("root",type=Path)
    p.add_argument("voice_id", choices=sorted(IDS))
    p.add_argument("audio",type=Path)
    p.add_argument("--transcript-file",required=True,type=Path)
    p.add_argument("--consent-record",required=True,type=Path,
                   help="Private record of explicit speaker consent; not copied into registry")
    p.add_argument("--guardian-record",type=Path,help="Private guardian authorization for a real child or teen voice")
    p.add_argument("--synthetic",action="store_true",help="Licensed fictional reference, not a real minor recording")
    a=p.parse_args()
    print("Prepared candidate:",prepare(a.root,a.voice_id,a.audio,a.transcript_file.read_text(encoding="utf-8"),a.consent_record,guardian_record=a.guardian_record,synthetic=a.synthetic))
    print("Not enabled. Run audition and native-dialect review first.")
if __name__=="__main__":main()

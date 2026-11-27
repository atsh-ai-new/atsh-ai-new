"""ATSH AI authenticated, opt-in workstation adapter for a local SadTalker installation."""
import argparse
import base64
import getpass
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

MAX_VIDEO = 25 * 1024 * 1024
MAX_RESPONSE = 6 * 1024 * 1024
KEY = re.compile(r"[a-f0-9]{64}")
UUID = re.compile(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", re.I)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(base, path, token, data=b"{}", mime="application/json"):
    req = urllib.request.Request(base + path, data=data, method="POST",
                                 headers={"Authorization": "Bearer " + token, "Content-Type": mime})
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=65) as r:
        body = r.read(MAX_RESPONSE + 1)
        if len(body) > MAX_RESPONSE:
            raise ValueError("Response exceeds limit")
        return r.status, body


def validate_job(job):
    if not UUID.fullmatch(job["id"]) or not KEY.fullmatch(job["jobToken"]):
        raise ValueError("Invalid job identifier")
    seconds, start, volume = (float(job[k]) for k in ("seconds", "start", "speechVolume"))
    if not (3 <= seconds <= 8 and 0 <= start < seconds - .1 and .5 <= volume <= 1.5):
        raise ValueError("Invalid job timing or volume")
    image, audio = (base64.b64decode(job[k], validate=True) for k in ("image", "audio"))
    if not (30 <= len(image) <= 184320 and image[:4] == b"RIFF" and image[8:12] == b"WEBP"):
        raise ValueError("Invalid source image")
    if not (44 <= len(audio) <= 4*1024*1024 and audio[:4] == b"RIFF" and audio[8:12] == b"WAVE"):
        raise ValueError("Invalid WAV")
    return image, audio, seconds, start, volume


def run(command, cancelled, timeout=120, env=None, cwd=None):
    if cancelled.is_set():
        raise RuntimeError("Job cancelled")
    # Do not copy any worker credentials to a model's process environment.
    clean_env = {k: v for k, v in (env or os.environ).items() if k != "ATSH_PORTRAIT_WORKER_TOKEN"}
    deadline = time.monotonic() + timeout
    with subprocess.Popen(command, cwd=cwd, env=clean_env, stdin=subprocess.DEVNULL) as child:
        try:
            while child.poll() is None:
                if cancelled.wait(1) or time.monotonic() >= deadline:
                    raise RuntimeError("Job cancelled or processing timed out")
            if child.returncode != 0:
                raise RuntimeError("Local processing failed")
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()


def probe(args, file):
    raw = subprocess.check_output([args.ffprobe, "-v", "error", "-show_streams", "-show_format",
                                   "-of", "json", str(file)], timeout=30)
    return json.loads(raw)


def validate_face_geometry(faces, width, height):
    # The supplied detector order is the order used by SadTalker.
    if not len(faces):
        raise ValueError("No clear frontal face detected; choose a clearer portrait")
    if any(not all(math.isfinite(v) for v in face) or face[2] <= 0 or face[3] <= 0
           for face in faces):
        raise ValueError("Invalid face detection")
    ranked = sorted(range(len(faces)), key=lambda i: faces[i][2] * faces[i][3], reverse=True)
    primary = faces[ranked[0]]
    _, _, w, h = primary
    if min(w, h) < max(48, .08 * min(width, height)):
        raise ValueError("Main face is too small; choose a higher-resolution portrait")
    if any(faces[i][2] * faces[i][3] >= .35 * w * h for i in ranked[1:]):
        raise ValueError("Multiple comparable faces detected; choose one main subject")
    # SadTalker uses the first detection. Do not animate a background face by mistake.
    if ranked[0] != 0:
        raise ValueError("Model selected a different face first; choose a clearer portrait of the main subject")
    return primary


def detect_portrait(png, model_dir):
    import cv2
    import numpy as np
    import torch
    from facexlib.detection import init_detection_model

    image = cv2.imdecode(np.frombuffer(png.read_bytes(), dtype=np.uint8),
                         cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)
    if image is None:
        raise ValueError("Unable to read portrait")
    h, w = image.shape[:2]
    if min(h, w) < 160:
        raise ValueError("Portrait is too small; select a higher-resolution image")
    weights = model_dir / "gfpgan" / "weights"
    if not (weights / "detection_Resnet50_Final.pth").is_file():
        raise RuntimeError("Installed SadTalker face detector weights not found")
    detector = init_detection_model("retinaface_resnet50", half=False, device="cpu",
                                    model_rootpath=str(weights))
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with torch.no_grad():
        detections = detector.detect_faces(rgb, .97)
    faces = [(float(d[0]), float(d[1]), float(d[2]-d[0]), float(d[3]-d[1]))
             for d in detections]
    primary = validate_face_geometry(faces, w, h)
    print(f"Portrait accepted: main face {primary[2]:.0f}x{primary[3]:.0f}px; "
          f"ignored {len(faces)-1} smaller background face(s).", flush=True)


def model_environment(args):
    threads = str(getattr(args, "cpu_threads", 2))
    return dict(os.environ, OMP_NUM_THREADS=threads, MKL_NUM_THREADS=threads,
                TORCH_FORCE_WEIGHTS_ONLY_LOAD="1", PYTHONNOUSERSITE="1")


def check_portrait(args, png, cancelled):
    # Release detector memory before starting the much heavier renderer.
    run([args.python, str(Path(__file__).resolve()), "--model-dir", str(args.model_dir),
         "--validate-source", str(png)], cancelled, timeout=180, env=model_environment(args),
        cwd=args.model_dir)


def speech_render_timing(duration, seconds, start, full_motion=False):
    if not all(math.isfinite(n) for n in (duration, seconds, start)) or duration <= 0 or start < 0 or duration + start > seconds + .03:
        raise ValueError("Speech exceeds scene duration; shorten it")
    if full_motion:
        return seconds, 0.0, 0.0
    # Render actual speech plus a short settling interval, not synthetic silence.
    # Quantize to the model's native 25 FPS; preserve sound and total scene duration.
    active = min(seconds - start, max(.92, math.ceil((duration + .20) * 25) / 25))
    if active < .92 or active >= seconds - .04:
        return seconds, 0.0, 0.0
    return active, start, max(0, seconds - start - active)


def render(args, folder, image, audio, seconds, start, volume, cancelled):
    png, wav, result = folder/"source.png", folder/"speech.wav", folder/"result"
    ff = [args.ffmpeg, "-nostdin", "-loglevel", "error", "-y"]
    run(ff + ["-i", str(image), "-frames:v", "1", str(png)], cancelled)
    check_portrait(args, png, cancelled)
    duration = float(probe(args, audio)["format"]["duration"])
    active, pre, post = speech_render_timing(duration, seconds, start, getattr(args, "full_motion", False))
    model_wav = folder/"active.wav"
    run(ff + ["-i", str(audio), "-af", f"volume={volume},adelay={round(start*1000)}:all=1,apad",
              "-t", str(seconds), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], cancelled)
    if pre or post:
        run(ff + ["-i", str(audio), "-af", f"volume={volume},apad", "-t", f"{active:.6f}",
                  "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(model_wav)], cancelled)
    else:
        model_wav = wav
    print(f"Model render: {active:.2f}s / scene: {seconds:.2f}s; idle hold: {pre + post:.2f}s", flush=True)
    result.mkdir()
    command = [args.python, str(args.model_dir/"inference.py"), "--source_image", str(png),
               "--driven_audio", str(model_wav), "--result_dir", str(result), "--size", "256",
               "--batch_size", "1", "--preprocess", "full"]
    if args.device == "cpu":
        command.append("--cpu")
    run(command, cancelled, timeout=90*60, env=model_environment(args), cwd=args.model_dir)
    videos = list(result.glob("*.mp4"))
    if len(videos) != 1:
        raise RuntimeError("Expected one final model video")
    output = folder/"output.mp4"
    # Clone only the idle frame outside speech; never drop speech frames.
    vf = f"fps=25,tpad=start_mode=clone:start_duration={pre:.6f}:stop_mode=clone:stop_duration={post + .08:.6f},scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1"
    run(ff + ["-i", str(videos[0]), "-i", str(wav), "-map", "0:v:0", "-map", "1:a:0",
              "-vf", vf, "-t", str(seconds), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23",
              "-c:a", "aac", "-movflags", "+faststart", str(output)], cancelled)
    info = probe(args, output)
    codecs = {s["codec_type"] for s in info["streams"]}
    if not {"audio", "video"} <= codecs or abs(float(info["format"]["duration"])-seconds) > .35:
        raise RuntimeError("Output streams or duration do not match")
    video_stream = next(s for s in info["streams"] if s["codec_type"] == "video")
    if abs(float(video_stream["duration"])-seconds) > .08:
        raise RuntimeError("Video does not cover scene duration")
    if not 12 <= output.stat().st_size <= MAX_VIDEO:
        raise RuntimeError("Output exceeds upload limit")
    return output


def process_job(args, base, token, job):
    image, audio, seconds, start, volume = validate_job(job)
    path = "/api/integrations/content-studio/" + job["id"] + "/result"
    stop, cancelled = threading.Event(), threading.Event()
    heartbeat_body = json.dumps({k:job[k] for k in ("id","jobToken")}).encode()

    def heartbeat():
        last_ok = time.monotonic()
        while not stop.is_set():
            try:
                request(base, "/api/integrations/portrait-worker/heartbeat", token, heartbeat_body)
                last_ok = time.monotonic()
            except urllib.error.HTTPError as e:
                if e.code in (401, 409):
                    cancelled.set()
                    return
            except Exception:
                pass
            if time.monotonic() - last_ok > 180:
                cancelled.set()
                return
            stop.wait(30)

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="atsh-portrait-") as tmp:
            folder = Path(tmp)
            img, aud = folder/"input.webp", folder/"input.wav"
            img.write_bytes(image)
            aud.write_bytes(audio)
            output = render(args, folder, img, aud, seconds, start, volume, cancelled)
            if cancelled.is_set():
                return
            payload = output.read_bytes()
            for attempt in range(3):
                if cancelled.is_set():
                    return
                try:
                    request(base, path, job["jobToken"], payload, "video/mp4")
                    print("Video delivered.", flush=True)
                    return
                except urllib.error.HTTPError as e:
                    if e.code == 409:
                        print("Job is no longer active.", flush=True)
                        return
                    if e.code < 500:
                        raise
                except (OSError, TimeoutError):
                    pass
                if attempt < 2:
                    cancelled.wait(10)
            raise RuntimeError("Unable to deliver video")
    except Exception as exc:
        print("Local job failed:", type(exc).__name__, flush=True)
        if not cancelled.is_set():
            try:
                request(base, path, job["jobToken"], b'{"status":"failed"}')
            except Exception:
                pass
    finally:
        stop.set()
        thread.join(timeout=70)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--python", default=sys.executable)
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--server", default="https://atsh-ai.com")
    parser.add_argument("--full-motion", action="store_true", help="Animate padding as well as speech; slower")
    parser.add_argument("--cpu-threads", type=int, choices=range(1, 9), default=2)
    parser.add_argument("--validate-source", type=Path, help="Check a portrait locally, without rendering or contacting the server")
    parser.add_argument("--benchmark-image", type=Path)
    parser.add_argument("--benchmark-audio", type=Path)
    parser.add_argument("--benchmark-output", type=Path)
    parser.add_argument("--benchmark-seconds", type=int, choices=range(3,9), default=8)
    args = parser.parse_args()
    args.model_dir = args.model_dir.resolve()
    if not (args.model_dir/"inference.py").is_file():
        parser.error("Local SadTalker inference.py not found")
    if args.validate_source:
        os.environ.update(model_environment(args))
        detect_portrait(args.validate_source.resolve(), args.model_dir)
        return
    for executable in (args.ffmpeg, args.ffprobe):
        subprocess.check_call([executable, "-version"], stdout=subprocess.DEVNULL)
    if args.benchmark_image or args.benchmark_audio or args.benchmark_output:
        if not all((args.benchmark_image,args.benchmark_audio,args.benchmark_output)):
            parser.error("All three benchmark paths are required")
        if args.benchmark_output.exists():
            parser.error("Benchmark output already exists")
        start = time.monotonic()
        with tempfile.TemporaryDirectory(prefix="atsh-benchmark-") as tmp:
            output = render(args,Path(tmp),args.benchmark_image.resolve(),args.benchmark_audio.resolve(),
                            args.benchmark_seconds,0,1,threading.Event())
            with args.benchmark_output.open("xb") as out:
                out.write(output.read_bytes())
        print(f"Offline benchmark: {time.monotonic()-start:.1f}s")
        return
    base = args.server.rstrip("/")
    url = urllib.parse.urlsplit(base)
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.path or url.query or url.fragment:
        parser.error("Server must be an HTTPS origin")
    token = os.environ.pop("ATSH_PORTRAIT_WORKER_TOKEN", "") or getpass.getpass("Worker token: ")
    if not KEY.fullmatch(token):
        parser.error("Invalid token")
    print("Worker is polling ATSH AI. Press Ctrl+C to stop.", flush=True)
    while True:
        try:
            status, body = request(base, "/api/integrations/portrait-worker/claim", token)
            if status == 200:
                process_job(args, base, token, json.loads(body))
        except urllib.error.HTTPError as e:
            print("Server response:", e.code, flush=True)
            if e.code == 401:
                break
        except Exception as exc:
            print("Polling error:", type(exc).__name__, flush=True)
        time.sleep(15)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Worker stopped.")

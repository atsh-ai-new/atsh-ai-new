"""ATSH AI authenticated, opt-in workstation adapter for a local SadTalker installation."""
import argparse
import base64
import getpass
import json
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


def render(args, folder, image, audio, seconds, start, volume, cancelled):
    png, wav, result = folder/"source.png", folder/"speech.wav", folder/"result"
    ff = [args.ffmpeg, "-nostdin", "-loglevel", "error", "-y"]
    run(ff + ["-i", str(image), "-frames:v", "1", str(png)], cancelled)
    duration = float(probe(args, audio)["format"]["duration"])
    if duration <= 0 or duration + start > seconds + .03:
        raise ValueError("Speech exceeds scene duration; shorten it")
    run(ff + ["-i", str(audio), "-af", f"volume={volume},adelay={round(start*1000)}:all=1,apad",
              "-t", str(seconds), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], cancelled)
    result.mkdir()
    command = [args.python, str(args.model_dir/"inference.py"), "--source_image", str(png),
               "--driven_audio", str(wav), "--result_dir", str(result), "--size", "256",
               "--batch_size", "1", "--preprocess", "full"]
    if args.device == "cpu":
        command.append("--cpu")
    env = dict(os.environ, OMP_NUM_THREADS="2", MKL_NUM_THREADS="2")
    run(command, cancelled, timeout=90*60, env=env, cwd=args.model_dir)
    videos = list(result.glob("*.mp4"))
    if len(videos) != 1:
        raise RuntimeError("Expected one final model video")
    output = folder/"output.mp4"
    run(ff + ["-i", str(videos[0]), "-i", str(wav), "-map", "0:v:0", "-map", "1:a:0",
              "-vf", "scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2",
              "-t", str(seconds), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23",
              "-c:a", "aac", "-movflags", "+faststart", str(output)], cancelled)
    info = probe(args, output)
    codecs = {s["codec_type"] for s in info["streams"]}
    if not {"audio", "video"} <= codecs or abs(float(info["format"]["duration"])-seconds) > .35:
        raise RuntimeError("Output streams or duration do not match")
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
    parser.add_argument("--benchmark-image", type=Path)
    parser.add_argument("--benchmark-audio", type=Path)
    parser.add_argument("--benchmark-output", type=Path)
    parser.add_argument("--benchmark-seconds", type=int, choices=range(3,9), default=8)
    args = parser.parse_args()
    args.model_dir = args.model_dir.resolve()
    if not (args.model_dir/"inference.py").is_file():
        parser.error("Local SadTalker inference.py not found")
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

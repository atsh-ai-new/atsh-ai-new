"""Replica Preview Q4. Local CLI, zero audio reference, one sentence per process."""
import logging
import os
import re
import shutil
import subprocess
import time

APPROVED_PILOT = {
    "egyptian-male": ("male, young adult, low pitch", 12, None),
    "egyptian-child-female": ("female, child, moderate pitch", 24, 472),
}
LIMIT_MIB = 1380
TIMEOUT = 160
OPTS = {
    "mem_saver": "true",
    "packed_projections": "false",
    "audio_tokenizer_graph_arena_mb": "48",
    "generator_prefill_graph_arena_mb": "64",
    "generator_decode_graph_arena_mb": "64",
    "audio_tokenizer_weight_context_mb": "32",
    "generator_weight_context_mb": "64",
}


def plain(text):
    return re.sub(r"[\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]", "", text).strip()


def runtime():
    path = os.environ.get("REPLICA_AUDIOCPP", "/opt/replica/bin/run")
    if not shutil.which(path):
        raise RuntimeError("Replica runtime not installed")
    return path


def render(model, voice, text, target):
    text = plain(text)
    if not re.search(r"[\u0621-\u064a]", text):
        raise ValueError("Arabic speech required")
    prompt, steps, seed = APPROVED_PILOT[voice]
    argv = [runtime(), "--task", "tts", "--family", "omnivoice", "--model", model,
            "--backend", "cpu", "--threads", "2", "--language", "arz",
            "--text", text, "--instruct", prompt,
            "--num-inference-steps", str(steps), "--out", str(target)]
    if seed is not None:
        argv += ["--seed", str(seed)]
    for key, value in OPTS.items():
        argv += ["--session-option", f"omnivoice.{key}={value}"]
    started = time.monotonic()
    peak = 0
    # Run at low priority, without passing service secrets to inference.
    env = {k: os.environ[k] for k in ("PATH", "LANG", "LC_ALL", "TZ") if k in os.environ}
    env.update(OMP_NUM_THREADS="2", OPENBLAS_NUM_THREADS="1")
    with subprocess.Popen(["nice", "-n", "10", *argv], env=env,
                          stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL) as p:
        while p.poll() is None:
            try:
                with open(f"/proc/{p.pid}/status") as status:
                    for line in status:
                        if line.startswith("VmRSS:"):
                            peak = max(peak, int(line.split()[1]))
                            break
            except FileNotFoundError:
                pass
            if peak > LIMIT_MIB * 1024 or time.monotonic() - started > TIMEOUT:
                p.kill()
                logging.warning("Replica stopped at resource guard: peak_mib=%.1f wall_s=%.1f",
                                peak/1024, time.monotonic()-started)
                raise RuntimeError("Replica resource limit")
            time.sleep(.025)
        if p.returncode or not target.is_file():
            raise RuntimeError("Replica synthesis failed")
    logging.warning("Replica generated: peak_mib=%.1f wall_s=%.1f", peak/1024, time.monotonic()-started)

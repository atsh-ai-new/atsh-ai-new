"""Explicit staging installer. Downloads public candidate assets, never enables profiles."""
import argparse, json, re
from pathlib import Path
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("root",type=Path)
    parser.add_argument("--audar",action="store_true",help="Also download Audar Flash and the gated, Apache-licensed NeuCodec")
    parser.add_argument("--codec-revision",help="Full reviewed revision of neuphonic/neucodec (accept terms on HF first)")
    args=parser.parse_args()
    if args.audar and not re.fullmatch("[a-f0-9]{40}",args.codec_revision or ""):parser.error("--audar requires an exact --codec-revision")
    from huggingface_hub import hf_hub_download,snapshot_download
    root=args.root.resolve();root.mkdir(parents=True,exist_ok=True)
    piper=root/"emirati"
    for name in ("arabic-emirati-female-model.onnx","arabic-emirati-female-model.onnx.json","README.md"):
        hf_hub_download("vadimbelsky/arabic-emirati-female-piper",name,revision="f89f1aec8e6486871ffdf8d878c5a39eaf918d60",local_dir=piper)
    if args.audar:
        for name in ("Audar-TTS-V1-Flash-Q4_K_M.gguf","LICENSE","README.md"):
            hf_hub_download("audarai/Audar-TTS-V1-Flash",name,revision="13049d435e7e84aa91c4461213905f9dba89ac15",local_dir=root/"audar")
        snapshot_download("neuphonic/neucodec",revision=args.codec_revision,local_dir=root/"neucodec",allow_patterns=["*.json","*.safetensors","README.md","LICENSE*"])
    config=root/"profiles.json"
    if not config.exists():
        config.write_text(Path(__file__).with_name("profiles.example.json").read_text(),encoding="utf-8")
    print("Candidate files installed. No voice enabled. Audition and approve each identity first.")
if __name__=="__main__":main()

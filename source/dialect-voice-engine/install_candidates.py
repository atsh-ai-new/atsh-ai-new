"""Explicit staging installer. Downloads public candidate assets, never enables profiles."""
import argparse, json, re
from pathlib import Path
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("root",type=Path)
    parser.add_argument("--audar",action="store_true",help="Download Audar Flash and the gated, Apache-licensed NeuCodec")
    parser.add_argument("--codec-revision",help="Full reviewed revision of neuphonic/neucodec (accept terms on HF first)")
    args=parser.parse_args()
    if args.audar and not re.fullmatch("[a-f0-9]{40}",args.codec_revision or ""):parser.error("--audar requires an exact --codec-revision")
    from huggingface_hub import hf_hub_download,snapshot_download
    root=args.root.resolve();root.mkdir(parents=True,exist_ok=True)
    if args.audar:
        for name in ("Audar-TTS-V1-Flash-Q4_K_M.gguf","LICENSE","README.md"):
            hf_hub_download("audarai/Audar-TTS-V1-Flash",name,revision="13049d435e7e84aa91c4461213905f9dba89ac15",local_dir=root/"audar")
        snapshot_download("neuphonic/neucodec",revision=args.codec_revision,local_dir=root/"neucodec",allow_patterns=["*.json","*.safetensors","README.md","LICENSE*"])
    config=root/"profiles.json"
    template=json.loads(Path(__file__).with_name("profiles.example.json").read_text())
    existing=json.loads(config.read_text(encoding="utf-8")) if config.exists() else {}
    if not isinstance(existing,dict):raise ValueError("Invalid existing registry")
    merged={**template,**existing}
    if merged!=existing:
        import os,tempfile
        with tempfile.NamedTemporaryFile(mode="w",dir=root,encoding="utf-8",delete=False) as tmp:
            json.dump(merged,tmp,ensure_ascii=False,indent=2)
        os.chmod(tmp.name,0o640)
        os.replace(tmp.name,config)
    print("Candidate files installed. No voice enabled. Audition and approve each identity first.")
if __name__=="__main__":main()


"""Stage the preserved synthetic voice reference archive, never auto-enable profiles."""
import argparse, hashlib, json, os, tempfile, zipfile
from pathlib import Path
from service import EGYPTIAN_IDS
MODEL="mohammedaly22/VoiceTut-TTS"
REVISION="b36bdf4416864d84f47ca77ce3decf34f6ab16cc"
def stage(root,archive,rights=False):
    root=Path(root).resolve()
    root.mkdir(parents=True,exist_ok=True)
    manifest=root/"profiles.json"
    profiles=json.loads(manifest.read_text()) if manifest.exists() else {}
    with zipfile.ZipFile(archive) as z:
        data=json.loads(z.read("manifest.json"))
        if data.get("model")!=MODEL or data.get("revision")!=REVISION:raise ValueError("Unexpected voice source")
        rows=data["voices"]
        if len(rows)!=18 or {v["voiceId"] for v in rows}!=EGYPTIAN_IDS:raise ValueError("Incomplete voice bank")
        pending=[]
        for v in rows:
            id=v["voiceId"]
            name=id+"-reference.wav"
            if v["file"]!=name or v.get("source")!="synthetic":raise ValueError("Invalid reference")
            item=z.getinfo(name)
            if not 44<item.file_size<=1000000:raise ValueError("Invalid file size")
            blob=z.read(item)
            digest=hashlib.sha256(blob).hexdigest()
            if digest!=v["sha256"]:raise ValueError("Reference digest mismatch")
            if profiles.get(id,{}).get("approved"):continue
            pending.append((id,blob,digest,v["transcript"]))
        refs=root/"voicetut-references"
        refs.mkdir(exist_ok=True)
        if not refs.resolve().is_relative_to(root):raise ValueError("Unsafe reference directory")
        for id,blob,digest,transcript in pending:
            path=refs/(id+"-"+digest[:12]+".wav")
            path.write_bytes(blob)
            profiles[id]={"engine":"voicetut","model":"voicetut","reference":str(path.relative_to(root)),"referenceSha256":digest,"transcript":transcript,"source":"synthetic","commercialRights":rights,"approved":False,"provisional":rights}
        with tempfile.NamedTemporaryFile(mode="w",dir=root,encoding="utf-8",delete=False) as tmp:
            json.dump(profiles,tmp,ensure_ascii=False,indent=2)
        os.chmod(tmp.name,0o640);os.replace(tmp.name,manifest)
    return len(pending)
if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("root",type=Path);p.add_argument("archive",type=Path)
    p.add_argument("--rights-reviewed",action="store_true",help="Confirm actual commercial source/voice rights review")
    a=p.parse_args()
    print("Staged",stage(a.root,a.archive,a.rights_reviewed),"voices; disabled until dedicated host explicitly enables them.")

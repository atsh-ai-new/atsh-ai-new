"""Candidate-only intelligibility and coverage audit. Never approves a voice."""
import argparse,hashlib,json,re,shutil,unicodedata
from pathlib import Path
from egyptian_voice_trial import ROLES,DIALOGUES

def normalize(s):
    s=unicodedata.normalize("NFKC",s)
    s="".join(c for c in s if unicodedata.category(c)!="Mn")
    s=s.translate(str.maketrans("أإآٱىة","اااايه"))
    return re.sub(r"[^\u0621-\u063a\u0641-\u064a]","",s)

def cer(a,b):
    prev=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        row=[i]
        for j,y in enumerate(b,1):
            row.append(min(row[-1]+1,prev[j]+1,prev[j-1]+(x!=y)))
        prev=row
    return prev[-1]/max(1,len(a))

def review(out,dialect,transcribe):
    out=Path(out)
    out.mkdir(parents=True,exist_ok=True)
    rows=json.loads((out/"metrics.json").read_text()) if (out/"metrics.json").is_file() else []
    errors=json.loads((out/"generation-errors.json").read_text()) if (out/"generation-errors.json").is_file() else []
    known={}
    duplicates=set()
    for row in rows:
        k=row.get("sample")
        if k in known:duplicates.add(k)
        known[k]=row
    results=[]
    # Only audited pairs are copied into the reviewer directory.
    approved_dir=out/"review-candidates"
    approved_dir.mkdir(exist_ok=True)
    for role in ROLES:
        identity=dialect+"-"+role
        checks=[]
        for stage in ("reference","dialogue"):
            key=identity+"-"+stage
            row=known.get(key)
            path=out/(key+".wav")
            check={"stage":stage,"passed":False}
            if not row or key in duplicates or not path.is_file():
                check["reason"]="Missing or duplicate generated sample"
            elif (row.get("voiceId")!=identity or row.get("stage")!=stage
                  or row.get("text")!=DIALOGUES[dialect][0 if stage=="reference" else 1]
                  or hashlib.sha256(path.read_bytes()).hexdigest()!=row.get("sha256")):
                check["reason"]="Sample identity, expected dialogue or integrity mismatch"
            else:
                try:
                    got=transcribe(path)
                    target=normalize(row["text"])
                    error=cer(target,normalize(got))
                    check.update(recognized=got,cer=round(error,3),passed=bool(target and normalize(got) and error<=.45))
                    if not check["passed"]:check["reason"]="Arabic intelligibility below threshold"
                except Exception as exc:check["reason"]="Transcription failed: "+str(exc)[:180]
            checks.append(check)
        passed=all(c["passed"] for c in checks)
        if passed:
            for stage in ("reference","dialogue"):
                key=identity+"-"+stage+".wav"
                shutil.copyfile(out/key,approved_dir/key)
        results.append({"voiceId":identity,"status":"native-listening-required" if passed else "rejected-or-incomplete","checks":checks})
    summary={"dialect":dialect,"expectedIdentities":len(ROLES),"machinePassed":sum(r["status"]=="native-listening-required" for r in results),
             "productionApproved":0,"identities":results,"generationErrors":errors}
    (out/"review.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    return summary

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("out",type=Path)
    p.add_argument("whisper_model")
    p.add_argument("--dialect",choices=DIALOGUES,required=True)
    args=p.parse_args()
    from faster_whisper import WhisperModel
    model=WhisperModel(args.whisper_model,device="cpu",compute_type="int8",cpu_threads=2,local_files_only=True)
    def transcribe(path):
        segments,_=model.transcribe(str(path),language="ar",beam_size=3,condition_on_previous_text=False)
        return " ".join(s.text for s in segments)
    report=review(args.out,args.dialect,transcribe)
    print(json.dumps(report,ensure_ascii=False),flush=True)
    if report["machinePassed"]!=report["expectedIdentities"]:
        raise SystemExit(1)

if __name__=="__main__":main()

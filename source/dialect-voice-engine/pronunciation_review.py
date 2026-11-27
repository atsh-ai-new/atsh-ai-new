"""Compare baseline and guided pronunciation with independent ASR; never approve accents."""
import argparse,hashlib,json,shutil
from pathlib import Path
from family_review import normalize,cer
from egyptian_voice_trial import ROLES,DIALOGUES
from pronunciation_trial import find_reference

def evaluate(baseline,out,dialect,transcribe):
    baseline=Path(baseline);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    rows=json.loads((out/"pronunciation-metrics.json").read_text()) if (out/"pronunciation-metrics.json").is_file() else []
    byid={row["voiceId"]:row for row in rows}
    result=[]
    listening=out/"listening-pairs";listening.mkdir(exist_ok=True)
    # Compare the SAME intended sentence, reference and identity. ASR errors
    # are a proxy for intelligibility, not evidence of a regional accent.
    for role in ROLES:
        identity=dialect+"-"+role
        row=byid.get(identity,{})
        target=DIALOGUES[dialect][1]
        old=list(baseline.rglob(identity+"-dialogue.wav"))
        new=out/(identity+"-guided.wav")
        report={"voiceId":identity,"status":"unavailable"}
        try:
            if len(old)!=1 or not new.is_file() or row.get("status")!="generated":raise ValueError("Missing sample")
            if row.get("text")!=target or hashlib.sha256(new.read_bytes()).hexdigest()!=row.get("sha256"):raise ValueError("Candidate integrity mismatch")
            if hashlib.sha256(find_reference(baseline,identity).read_bytes()).hexdigest()!=row.get("referenceSha256"):raise ValueError("Reference identity mismatch")
            a=transcribe(old[0]);b=transcribe(new)
            baseline_error=cer(normalize(target),normalize(a));guided_error=cer(normalize(target),normalize(b))
            report.update(baselineText=a,guidedText=b,baselineCer=round(baseline_error,3),guidedCer=round(guided_error,3))
            # Retain pairs for neutral listening even if the proposed tuning
            # does not improve ASR. Never replace the baseline automatically.
            if normalize(b) and guided_error<=.45:
                shutil.copyfile(old[0],listening/(identity+"-A-baseline.wav"))
                shutil.copyfile(new,listening/(identity+"-B-guided.wav"))
                report["status"]="improved-intelligibility" if guided_error<baseline_error else ("same-intelligibility" if guided_error==baseline_error else "regressed-intelligibility")
                report["nativeListeningRequired"]=True
            else:report["status"]="rejected"
        except Exception as exc:report["reason"]=str(exc)[:180]
        result.append(report)
    summary={"dialect":dialect,"identities":result,"productionApproved":0,
             "improved":sum(r["status"]=="improved-intelligibility" for r in result),
             "comparable":sum("guidedCer" in r for r in result)}
    (out/"pronunciation-review.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    return summary
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("baseline",type=Path);p.add_argument("out",type=Path);p.add_argument("whisper_model")
    p.add_argument("--dialect",choices=DIALOGUES,required=True)
    a=p.parse_args()
    from faster_whisper import WhisperModel
    model=WhisperModel(a.whisper_model,device="cpu",compute_type="int8",cpu_threads=2,local_files_only=True)
    def transcribe(path):
        segments,_=model.transcribe(str(path),language="ar",beam_size=3,condition_on_previous_text=False)
        return " ".join(s.text for s in segments)
    report=evaluate(a.baseline,a.out,a.dialect,transcribe)
    print(json.dumps(report,ensure_ascii=False),flush=True)
    if report["comparable"]!=len(ROLES):raise SystemExit(1)
if __name__=="__main__":main()

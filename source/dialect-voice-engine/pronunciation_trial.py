"""A/B pronunciation audition using the same previously tested fictional voice reference."""
import argparse, hashlib, json, resource, time
from pathlib import Path
from egyptian_voice_trial import ROLES,DIALOGUES
from voice_quality import check_signal

# Hand-written pronunciation hints, not a universal dialect converter. Preserve
# the script meaning and avoid adding formal Arabic case endings. Native review
# is still needed, especially for regional qaf/gim and prosody.
GUIDED={
    "egyptian":"بُصّ، عَنْدي فِكْرَة حِلْوَة لِلْمَشْروع. يَلّا نِجَرَّبْها مَع بَعْض.",
    "alexandrian":"بُصّ بَقى، إِحْنا هَنِبْدَأ الشُّغْل، ونْظَبَّط كُلّ حاجَة سَوا.",
    "saidi":"يا مَرْحَب بيك. عَنْدِنا فِكْرَة زَيْنَة، وَهَنَعْمِلْها مَع بَعْض."
}
PARAMETERS={"num_step":48,"guidance_scale":2.25,"speed":.94}
def find_reference(baseline,identity):
    paths=list(Path(baseline).rglob(identity+"-reference.wav"))
    if len(paths)!=1:raise ValueError("Exactly one original reference is required")
    return paths[0]

def audition(model, baseline, out, dialect):
    import soundfile as sf
    import torch
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    rows=[]
    def checkpoint():
        (out/"pronunciation-metrics.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    for i,role in enumerate(ROLES):
        identity=dialect+"-"+role
        row={"voiceId":identity,"text":DIALOGUES[dialect][1],"spokenHint":GUIDED[dialect],"parameters":PARAMETERS}
        started=time.monotonic()
        try:
            reference=find_reference(baseline,identity)
            torch.manual_seed(3026+100*list(DIALOGUES).index(dialect)+i)
            with torch.inference_mode():
                wav=model.generate(text=GUIDED[dialect],language_id="arz",ref_audio=str(reference),
                    ref_text=DIALOGUES[dialect][0],**PARAMETERS)[0]
            signals=check_signal(wav,24000)
            output=out/(identity+"-guided.wav")
            sf.write(output,wav,24000,subtype="PCM_16")
            row.update(status="generated",sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                referenceSha256=hashlib.sha256(reference.read_bytes()).hexdigest(),seconds=len(wav)/24000,
                renderSeconds=round(time.monotonic()-started,2),maxRssMiB=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),**signals)
        except Exception as exc:row.update(status="failed",reason=str(exc)[:300])
        rows.append(row);checkpoint();print(row,flush=True)
    return rows

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("model",type=Path);p.add_argument("baseline",type=Path);p.add_argument("out",type=Path)
    p.add_argument("--dialect",choices=DIALOGUES,required=True)
    args=p.parse_args()
    import torch
    from omnivoice import OmniVoice
    torch.set_num_threads(2)
    model=OmniVoice.from_pretrained(str(args.model),device_map="cpu",dtype=torch.float32)
    audition(model,args.baseline,args.out,args.dialect)

if __name__=="__main__":main()

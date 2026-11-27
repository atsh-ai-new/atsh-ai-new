"""Isolated VoiceTut candidate auditions, never activates or installs a production voice."""
import argparse, json, resource, time, hashlib
from pathlib import Path
from service import EGYPTIAN_IDS
from voice_quality import check_signal

ROLES={"male":"male, middle-aged","female":"female, middle-aged",
       "child-male":"male, child","child-female":"female, child",
       "teen-male":"male, teenager","teen-female":"female, teenager"}
# Colloquial script is a test input, NOT a label of a verified regional accent.
DIALOGUES={
    "egyptian":("إزيك عامل إيه؟ أنا مبسوط أوي إن إحنا هنشتغل سوا.","بص، عندي فكرة حلوة للمشروع، يلا نجربها مع بعض."),
    "alexandrian":("إزيك يا صاحبي، الجو حلو النهارده، يلا نتمشى ع البحر.","بص بقى، إحنا هنبدأ الشغل ونظبط كل حاجة سوا."),
    "saidi":("كيف حالك؟ إحنا معاك وهنخلص الشغل سوا.","يا مرحب بيك، عندنا فكرة زينة وهنعملها مع بعض.")
}

def audition(model, out, dialect):
    import soundfile as sf
    import torch
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    rows=[]
    errors=[]
    def checkpoint():
        (out/"metrics.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2))
        (out/"generation-errors.json").write_text(json.dumps(errors,ensure_ascii=False,indent=2))
    checkpoint()
    for i,(role,instruct) in enumerate(ROLES.items()):
        identity=f"{dialect}-{role}"
        assert identity in EGYPTIAN_IDS
        ref_text,dialogue=DIALOGUES[dialect]
        torch.manual_seed(2026+100*list(DIALOGUES).index(dialect)+i)
        for stage,line in (("reference",ref_text),("dialogue",dialogue)):
            key=identity+"-"+stage
            started=time.monotonic()
            # Second new sentence must reuse a reference identity, not a new random voice.
            kwargs={"instruct":instruct} if stage=="reference" else {"ref_audio":str(out/(identity+"-reference.wav")),"ref_text":ref_text}
            try:
                with torch.inference_mode():
                    wav=model.generate(text=line,language_id="arz",num_step=32,**kwargs)[0]
                signals=check_signal(wav,24000)
                path=out/(key+".wav")
                sf.write(path,wav,24000,subtype="PCM_16")
                row={"sample":key,"voiceId":identity,"stage":stage,"text":line,
                     "seconds":len(wav)/24000,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
                     "renderSeconds":round(time.monotonic()-started,2),
                     "maxRssMiB":round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),**signals}
                rows.append(row)
                print(row,flush=True)
            except Exception as exc:
                errors.append({"voiceId":identity,"stage":stage,"reason":str(exc)[:300]})
                print("Rejected generation:",errors[-1],flush=True)
                # A failed reference cannot be reused for the independent sentence.
                checkpoint()
                break
            checkpoint()
    return rows

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("model",type=Path)
    p.add_argument("out",type=Path)
    p.add_argument("--dialect",choices=DIALOGUES,default="egyptian")
    a=p.parse_args()
    import torch
    from omnivoice import OmniVoice
    torch.set_num_threads(2)
    model=OmniVoice.from_pretrained(str(a.model),device_map="cpu",dtype=torch.float32)
    audition(model,a.out,a.dialect)

if __name__=="__main__":main()

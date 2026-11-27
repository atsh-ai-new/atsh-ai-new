"""Evaluation of Egyptian NAMAA, not a deployable provider."""
import json,resource,sys,time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from voice_quality import check_signal

def main():
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    torch.manual_seed(2026)
    base=Path(sys.argv[1]); out=Path(sys.argv[2])
    model=ChatterboxMultilingualTTS.from_local(base,"cpu")
    metrics=[]
    for key,line in [("dialogue","إزيك، عامل إيه؟ بص أنا عندي فكرة حلوة أوي."),("advert","عندك فكرة مشروع؟ إحنا معاك من أول خطوة لحد ما تشوف حلمك قدام عينك.")]:
        start=time.monotonic()
        with torch.inference_mode():
            wav=model.generate(line,language_id="ar")
        x=wav.detach().cpu().numpy().reshape(-1)
        signals=check_signal(x,model.sr)
        sf.write(out/(key+".wav"),x,model.sr,subtype="PCM_16")
        metrics.append({"sample":key,"text":line,"seconds":len(x)/model.sr,"renderSeconds":round(time.monotonic()-start,2),"maxRssMiB":round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),**signals})
        print(metrics[-1],flush=True)
    (out/"metrics.json").write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
if __name__=="__main__":main()

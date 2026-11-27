"""Isolated evaluation only, not a production provider or voice enrollment."""
import json, sys, time, resource
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from kokoro import KModel
from kemetone import EgyptianG2P

def main():
    model_dir=Path(sys.argv[1]); out=Path(sys.argv[2])
    torch.set_num_threads(1);torch.set_num_interop_threads(1)
    model=KModel(repo_id="Rabe3/kemetone",config=str(model_dir/"config.json"),model=str(model_dir/"kemetone.pth")).to("cpu").eval()
    voice=torch.load(str(model_dir/"voices/kemetone.pt"),map_location="cpu",weights_only=True)
    g2p=EgyptianG2P()
    lines=[
        ("dialogue","إِزَّيِّك، عَامِل إِيه؟ بُصّ، أَنَا عِنْدِي فِكْرَة حِلْوَة أَوِي."),
        ("advert","عِنْدَك فِكْرَة مَشْرُوع؟ إِحْنَا مَعَاك مِنْ أَوِّل خُطْوَة لِحَدّ مَا تِشُوف حُلْمَك قُدَّام عَيْنِك."),
        ("conversation","طَيِّب، خَلِّينَا نِبْدَأ النَّهَارْدَه، وِنِجَرَّب مَعَ بَعْض. مَا تِقْلَقْش، الدُّنْيَا هَتِبْقَى تَمَام.")
    ]
    metrics=[]
    for key, text in lines:
        start=time.monotonic()
        ipa=g2p(text)
        if not isinstance(ipa,str) or not 0<len(ipa)<510:raise ValueError("Invalid phoneme sequence")
        with torch.inference_mode():
            audio=model(ipa,voice[len(ipa)-1])
        samples=audio.cpu().numpy().reshape(-1)
        if not np.isfinite(samples).all() or not 24000<len(samples)<24000*32 or np.max(np.abs(samples))<.005:raise ValueError("Invalid audio")
        sf.write(out/(key+".wav"),samples,24000,subtype="PCM_16")
        metrics.append({"sample":key,"seconds":len(samples)/24000,"renderSeconds":round(time.monotonic()-start,2),"maxRssMiB":round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1)})
    (out/"metrics.json").write_text(json.dumps(metrics,indent=2))
    print(json.dumps(metrics),flush=True)
if __name__=="__main__":main()

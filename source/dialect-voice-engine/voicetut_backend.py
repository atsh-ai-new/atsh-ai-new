"""Offline CPU engine for the pinned, provisional Egyptian audition voices."""
from functools import lru_cache
@lru_cache(maxsize=1)
def load_model(path):
    import torch
    from omnivoice import OmniVoice
    torch.set_num_threads(2)
    return OmniVoice.from_pretrained(path,device_map="cpu",dtype=torch.float32)
def render(entry,text,speed,target):
    import torch
    import soundfile as sf
    from voice_quality import check_signal
    model=load_model(entry["model"])
    with torch.inference_mode():
        wav=model.generate(text=text,language_id="arz",ref_audio=entry["reference"],ref_text=entry["transcript"],num_step=48,guidance_scale=2.25,speed=.94*speed)[0]
    check_signal(wav,24000)
    sf.write(target,wav,24000,subtype="PCM_16")

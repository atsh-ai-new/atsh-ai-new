"""Conservative signal checks; passing is not proof of intelligible speech."""
import wave
import numpy as np

def check_signal(samples, rate):
    x=np.asarray(samples,dtype=np.float64).reshape(-1)
    if not 8000<=rate<=48000 or not rate//4<=len(x)<=rate*33 or not np.isfinite(x).all():
        raise ValueError("Invalid voice signal")
    rms=float(np.sqrt(np.mean(x*x)))
    if rms<0.002 or np.mean(np.abs(x)>=.999)>0.01:
        raise ValueError("Silent or clipped voice signal")
    size=1024
    # Averaging windows captures sustained high-frequency distortion without
    # rejecting brief fricatives or consonants in otherwise natural speech.
    windows=np.lib.stride_tricks.sliding_window_view(x,size)[::size//2]
    power=np.mean(np.abs(np.fft.rfft(windows*np.hanning(size),axis=1))**2,axis=0)
    freq=np.fft.rfftfreq(size,1/rate)
    total=float(power.sum())
    if total<=0:raise ValueError("No spectral energy")
    high=float(power[freq>=4000].sum()/total)
    speech=float(power[(freq>=100)&(freq<=3500)].sum()/total)
    top=np.argsort(power)[-3:]
    narrow=float(power[top].sum()/total)
    if high>.55 or speech<.35 or narrow>.80:
        raise ValueError(f"Non-speech distortion (high={high:.3f}, speech={speech:.3f}, tones={narrow:.3f})")
    return {"highBandRatio":round(high,4),"speechBandRatio":round(speech,4),"rms":round(rms,5)}

def check_pcm16(path):
    with wave.open(str(path),"rb") as f:
        if f.getsampwidth()!=2 or f.getnchannels()!=1:raise ValueError("Expected mono PCM16")
        return check_signal(np.frombuffer(f.readframes(f.getnframes()),dtype="<i2")/32768.,f.getframerate())

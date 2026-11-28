"""Audio-driven mouth aperture. Not a phoneme recognizer."""
import math
STEP=160  # 10 ms at 16 kHz

def _smooth(x):
    q=min(1.,max(0.,x));return q*q*(3.-2.*q)

def _filter(xs,f,high=False):
    w=2*math.pi*f/16000
    c=math.cos(w);p=math.sin(w)/math.sqrt(2);a=1+p
    b0=((1+c) if high else (1-c))/(2*a);b1=(-2 if high else 2)*b0
    a1=-2*c/a;a2=(1-p)/a
    d=e=0.
    out=[]
    for x in xs:
        y=b0*x+d;d=b1*x-a1*y+e;e=b0*x-a2*y
        out.append(y)
    return out

def aperture(samples):
    """One bounded value per 10 ms, computed once from each unmixed WAV.

    Relatively loud vowels open the mouth. Low-energy stop closures and
    low-resonance voiced intervals reduce its opening even with audible sound.
    Unvoiced consonants are only partly open. Silent intervals never move.
    """
    if not samples:return ()
    mid=_filter(_filter(samples,500,True),2750)
    high=_filter(samples,2800,True)
    features=[]
    for n in range(0,len(samples),STEP):
        a=max(0,n-128);b=min(len(samples),n+129);m=b-a
        def rms(xs):return math.sqrt(sum(v*v for v in xs[a:b])/m)
        strength=rms(samples)
        features.append((strength,rms(mid)/max(1,strength),rms(high)/max(1,strength)))
    ranked=sorted(x[0] for x in features)
    upper=max(100,ranked[int(.90*(len(ranked)-1))])
    lower=ranked[int(.16*(len(ranked)-1))]
    # Cap the noise estimate when a clip has little or no silence.
    threshold=max(40,min(upper*.046,lower*2.15))
    targets=[]
    for gain,resonance,sibilance in features:
        if gain<=threshold:targets.append(0.);continue
        v=(gain-threshold)/max(40,upper-threshold)
        strength=min(1.,v**.62)
        body=_smooth((resonance-.24)/.50)
        sound=strength*(.18+.82*body)
        if sibilance>.40:sound*=.67
        targets.append(sound)
    # Small bounded anticipation and release; silence itself never opens.
    return tuple(0. if v==0. else .22*targets[max(0,i-1)]+.56*v+.22*targets[min(i+1,len(targets)-1)] for i,v in enumerate(targets))

def at(track,index,intensity=1):
    if not track or index<0:return 0.
    j,f=divmod(index,STEP)
    if j>=len(track):return 0.
    u=f/STEP
    return min(1.,max(0.,(track[j]*(1-u)+(track[j+1] if j+1<len(track) else 0.)*u)*intensity))

def mouth_overlay(im,opening):
    """Morph only a registered mouth overlay. Do not move eyes/head or blend two poses."""
    if opening<.065:return None
    box=im.getbbox()
    if not box:return None
    x0,y0,x1,y1=box;w=x1-x0;h=y1-y0
    if h<9 or w<10 or h>im.height*.15 or w>im.width*.70:
        return im if opening>=.15 else None
    from PIL import Image
    patch=im.crop(box)
    # Keep the original registration edge fixed; compress the aperture toward
    # the upper lip, so the rest of the image never resizes with the jaw.
    amount=max(.32,min(1.,.32+opening*.68))
    old=(0,h*.25,h*.73,h)
    center=h*.43
    new=[0,round(center+(old[1]-center)*amount),round(center+(old[2]-center)*amount),h]
    if not 0<new[1]<new[2]<h:return im if opening>=.15 else None
    mesh=[((0,a,w,b),(0,old[i],0,old[i+1],w,old[i+1],w,old[i])) for i,(a,b) in enumerate(zip(new,new[1:]))]
    selected=patch.transform(patch.size,Image.Transform.MESH,mesh,resample=Image.Resampling.BICUBIC)
    if opening<.17:
        factor=_smooth((opening-.065)/.105)
        selected.putalpha(selected.getchannel("A").point(lambda p:round(p*factor)))
    layer=Image.new("RGBA",im.size);layer.paste(selected,(x0,y0));return layer

"""Opt-in directed single side step for registered 2D Studio rigs."""
import math,re,unicodedata
from PIL import Image
PARTS=("left-leg","right-leg")
CUE=re.compile(r"(?<!\w)خطو[ةه]\s+(?:(?:واحد[ةه]|جانبي[ةه])\s+)?(?:لناحي[ةه]\s+|ناحي[ةه]\s+|نحو\s+|إ?لى\s+|لل?\s*)?(?:ال)?(يمين|يسار|شمال)(?!\w)")
ENG=re.compile(r"\b(?:a\s+|one\s+)?(?:side[ -]?step|step)\s+(?:(?:to\s+)?(?:the\s+)?)?(left|right)\b",re.I)
def direction(text):
    clean="".join(x for x in unicodedata.normalize("NFKC",str(text or "")) if unicodedata.category(x)!="Mn" and x!="ـ")
    # Refuse ambiguity, negation and mixed directions instead of inventing blocking.
    if re.search(r"(?<!\w)(لا|بدون|من غير|مش|عكس|متاخدش|ماتاخدش|no|not|without|don't)(?!\w)",clean,re.I):return 0
    values={1 if x=="يمين" else -1 for x in CUE.findall(clean)}
    values.update(1 if x.lower()=="right" else -1 for x in ENG.findall(clean))
    return values.pop() if len(values)==1 else 0

def smooth(x):
    u=max(0,min(1,x));return u*u*(3-2*u)
def keys(t,items):
    for (a,x),(b,y) in zip(items,items[1:]):
        if t<b:return x+(y-x)*smooth((t-a)/(b-a))
    return items[-1][1]
def add(a,b):return a[0]+b[0],a[1]+b[1]
def sub(a,b):return a[0]-b[0],a[1]-b[1]
def length(a):return math.hypot(*a)
def atan(a):return math.atan2(a[1],a[0])
def ik(hip,ankle,l1,l2,side):
    dx,dy=sub(ankle,hip);d=math.hypot(dx,dy)
    if not abs(l1-l2)<d<=l1+l2+.0001:return None
    a=(d*d+l1*l1-l2*l2)/(2*d);b=math.sqrt(max(0,l1*l1-a*a))*side
    return (hip[0]+(dx*a-dy*b)/d,hip[1]+(dy*a+dx*b)/d)

class Leg:
    def __init__(self,im,pivot):
        self.im=im
        mask=im.getchannel("A").point(lambda i: 255 if i>=80 else 0)
        self.box=mask.getbbox()
        if self.box is None:raise ValueError("Empty leg")
        w,h=im.size
        x0,y0,x1,y1=self.box
        self.hip=pivot
        span=y1-pivot[1]
        if span<h*.27 or span>h*.66 or not (x0-w*.055<=pivot[0]<=x1+w*.055 and y0-h*.04<=pivot[1]<=y0+h*.18):
            raise ValueError("Unsupported leg geometry")
        ay=round(pivot[1]+span*.86)
        ky=round(pivot[1]+span*.45)
        def center(y):
            box=mask.crop((x0,y-3,x1,y+4)).getbbox()
            if box is None:raise ValueError("Leg slice missing")
            return x0+(box[0]+box[2]-1)/2
        self.knee=(center(ky),ky);self.ankle=(center(ay),ay);self.bottom=y1
        u=sub(self.knee,self.hip);v=sub(self.ankle,self.hip)
        self.side=1 if v[0]*u[1]-v[1]*u[0]>=0 else -1
        self.l1,self.l2=length(u),length(sub(self.ankle,self.knee))
    def controls(self,delta,foot):
        hip=add(self.hip,delta);ankle=add(self.ankle,foot)
        return hip,ik(hip,ankle,self.l1,self.l2,self.side),ankle
    def draw(self,canvas,delta,foot):
        h,k,a=self.controls(delta,foot)
        if k is None:raise ValueError("Grounded-step target out of reach")
        if delta==foot==(0,0):
            canvas.alpha_composite(self.im);return
        box=self.box;w,hei=self.im.size
        x0=max(0,int(box[0]+min(delta[0],foot[0])-w*.10));x1=min(w,int(box[2]+max(delta[0],foot[0])+w*.10+1))
        y0=max(0,int(box[1]+min(delta[1],foot[1])-hei*.035));y1=min(hei,int(box[3]+max(delta[1],foot[1])+hei*.035+1))
        def inverse(s0,s1,t0,t1):
            ang=atan(sub(s1,s0))-atan(sub(t1,t0));c,v=math.cos(ang),math.sin(ang)
            return lambda x,y:(s0[0]+c*(x-t0[0])-v*(y-t0[1]),s0[1]+v*(x-t0[0])+c*(y-t0[1]))
        top=inverse(self.hip,self.knee,h,k);bottom=inverse(self.knee,self.ankle,k,a)
        def uv(x,y):
            p=top(x,y);q=bottom(x,y)
            l=smooth((y-k[1]+hei*.021)/(hei*.042))
            ankle=smooth((y-a[1]+hei*.020)/(hei*.022))
            waist=smooth((y-h[1]+hei*.005)/(hei*.064))
            limb=(p[0]*(1-l)+q[0]*l,p[1]*(1-l)+q[1]*l)
            return tuple((shift*(1-waist)+v*waist)*(1-ankle)+f*ankle for shift,v,f in zip((x-delta[0],y-delta[1]),limb,(x-foot[0],y-foot[1])))
        step=max(4,hei//120)
        xx=list(range(x0,x1,step))+[x1];yy=sorted(set(list(range(y0,y1,step))+[y1,int(max(y0,min(y1,math.ceil(a[1]+hei*.002))))]))
        points={(x,y):uv(x,y) for x in xx for y in yy}
        mesh=[((x-x0,y-y0,u-x0,v-y0),(*points[x,y],*points[x,v],*points[u,v],*points[u,y])) for x,u in zip(xx,xx[1:]) for y,v in zip(yy,yy[1:])]
        image=self.im.transform((x1-x0,y1-y0),Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
        canvas.alpha_composite(image,(x0,y0))

class Step:
    def __init__(self,rig,sign,size):
        self.w,self.h=size;self.sign=sign
        w,h=size; pad=round(w*.17);self.pad=pad;self.size=(w+pad*2,h)
        self.rig={}
        for name,(im,x,y) in rig.items():
            if im.size != rig["torso"][0].size:raise ValueError("Register all layers on one canvas")
            layer=Image.new("RGBA",self.size);layer.alpha_composite(im.resize(size,Image.Resampling.LANCZOS),(pad,0))
            self.rig[name]=(layer,x*w+pad,y*h)
        self.legs=[Leg(self.rig[p][0],self.rig[p][1:]) for p in PARTS]
        self.lead=(0 if self.legs[0].ankle[0]<self.legs[1].ankle[0] else 1) if sign<0 else (0 if self.legs[0].ankle[0]>self.legs[1].ankle[0] else 1)
        self.travel=min(w*.22,h*.078)*sign
        # Verify every pose once. Static fallback if authored rig doesn't have the reach.
        for i in range(85):
            hip,feet=self.pose(i/50)
            if any(leg.controls(hip,f)[1] is None for leg,f in zip(self.legs,feet)):
                raise ValueError("Step does not fit this rig")
    def pose(self,t):
        # 0.0–.36 load the support leg, .36–.94 swing, .94–1.42 take weight.
        u=max(0,min(1,(t-.36)/.58));lift=(math.sin(math.pi*u)**1.55 if 0<u<1 else 0)*self.h*.023
        lead=(self.travel*smooth(u),-lift)
        hip_x=keys(t,[(0,0),(.35,-self.travel*.13),(.53,0),(.94,self.travel*.42),(1.38,self.travel*.66),(1.58,self.travel*.64)])
        hip_y=keys(t,[(0,0),(.31,self.h*.005),(.65,self.h*.004),(.94,self.h*.006),(1.07,self.h*.009),(1.58,self.h*.003)])
        feet=[lead if i==self.lead else (0,0) for i in range(2)]
        # Lower the pelvis only as far as reach allows. A bigger dip creates
        # an exaggerated double crouch in almost-straight front-view art.
        for leg,foot in zip(self.legs,feet):
            x,y=sub(add(leg.ankle,foot),leg.hip)
            limit=(leg.l1+leg.l2)**2-(x-hip_x)**2
            if limit>0:hip_y=max(hip_y,y-math.sqrt(limit))
        # The supporting foot is fixed for the entire shot. The moving foot
        # stays at its target after touchdown; neither foot is driven by body sway.
        return (hip_x,hip_y),feet
    def frame(self,t,amp):
        c=Image.new("RGBA",self.size);pelvis,feet=self.pose(t)
        for i,leg in enumerate(self.legs):leg.draw(c,pelvis,feet[i])
        move=(round(pelvis[0]),round(pelvis[1]))
        for p in ("left-arm","torso","right-arm","head","eyes-closed","mouth-open"):
            if p not in self.rig or p=="mouth-open" and amp<.15 or p=="eyes-closed" and not .25<t%4.2<.34:continue
            im,x,y=self.rig[p]
            arm=keys(t,[(0,0),(.43,-1.4),(.88,2.5),(1.44,0)])
            if p in ("left-arm","right-arm"):
                im=im.rotate(arm*self.sign*(1 if p=="right-arm" else -1),resample=Image.Resampling.BICUBIC,center=(x,y))
            c.alpha_composite(im,move)
        return c

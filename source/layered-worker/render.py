"""CPU-only layered compositor. Artwork is prepared, never generated per frame."""
import base64, io, math, os, subprocess, tempfile, wave, array, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
FPS=25
SLOTS={"left":.18,"center-left":.38,"center":.5,"center-right":.62,"right":.82}
FONT=os.environ.get("STUDIO_FONT","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
def img(data):
    with Image.open(io.BytesIO(base64.b64decode(data,validate=True))) as im:
        if im.format!="WEBP" or im.width*im.height>2073600 or max(im.size)>1920: raise ValueError("Invalid image")
        return im.convert("RGBA")
def place(canvas,image,x,y,height,width=None):
    size=(max(1,round(height*image.width/image.height)),max(1,round(height))) if width is None else (max(1,round(width)),max(1,round(height)))
    a=image.resize(size,Image.Resampling.BILINEAR)
    canvas.alpha_composite(a,(round(x-a.width/2),round(y-a.height)))
def blend(im,other,k):
    if other is None:return im
    return Image.blend(im,other.resize(im.size,Image.Resampling.BILINEAR),max(0,min(1,k)))
def background(size,shot):
    w,h=size
    if shot.get("artwork"):
        a=shot["artwork"]; i=img(a["image"])
        if a.get("framing")=="fill":return ImageOps.fit(i,size,Image.Resampling.LANCZOS)
        c=Image.new("RGBA",size,(25,30,48)); x=ImageOps.contain(i,size);c.alpha_composite(x,((w-x.width)//2,(h-x.height)//2));return c
    c=Image.new("RGBA",size);d=ImageDraw.Draw(c)
    palette={"studio":(35,39,66),"office":(46,57,76),"technology":(25,36,72)};p=palette[shot["background"]]
    for y in range(h):
        q=y/h;d.line((0,y,w,y),fill=tuple(min(255,int(x+55*q)) for x in p)+(255,))
    d.rectangle((0,int(h*.78),w,h),fill=(42,43,60))
    for j in range(1,4):
        x=int(j*w/4);d.rounded_rectangle((x-w//11,h//9,x+w//11,h//2),radius=20,fill=(73,90,125),outline=(115,124,155),width=3)
    return c
def read_pcm(path):
    raw=subprocess.check_output(["ffmpeg","-v","error","-i",str(path),"-t","33","-f","s16le","-ac","1","-ar","16000","-"],timeout=40)
    a=array.array("h");a.frombytes(raw)
    if sys.byteorder!="little":a.byteswap()
    return a
def audio_for_scene(shot,scene,voice,folder,volume,music,music_volume,track=None):
    total=scene["seconds"]*16000; mix=[0.0]*total; lines=[]
    last=0
    for l in sorted(shot["dialogue"],key=lambda l:l["start"]):
        audio=folder/(l["id"]+".wav");audio.write_bytes(voice(l["id"]));v=read_pcm(audio);start=round(l["start"]*16000);end=start+len(v)
        if start<last or end>total+480:raise ValueError("Dialogue overlaps or exceeds scene")
        end=min(end,total);last=end
        for j,k in enumerate(v[:end-start]):mix[start+j]+=k*volume
        lines.append((l,start,end,v))
    def mix_clip(data,gain,loop=False):
        path=folder/"clip.audio";path.write_bytes(base64.b64decode(data,validate=True));samples=read_pcm(path)
        if not samples:return
        for i in range(total if loop else min(total,len(samples))):mix[i]+=samples[i%len(samples)]*gain
    if shot.get("effect"):mix_clip(shot["effect"]["audio"],.35)
    if music and track:mix_clip(track["audio"],music_volume,True)
    elif music:
        # Original unobtrusive synthetic bed; no sample or third-party song.
        for i in range(total):
            t=i/16000; fading=min(1,t/.25,(total-i)/4000)
            mix[i]+=800*music_volume*fading*(math.sin(2*math.pi*130.8128*t)+.45*math.sin(2*math.pi*196*t))
    out=folder/("audio-"+str(shot["sceneIndex"])+".wav")
    a=array.array("h",(int(max(-32768,min(32767,v))) for v in mix))
    if sys.byteorder!="little":a.byteswap()
    with wave.open(str(out),"wb") as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000);f.writeframes(a.tobytes())
    return out,lines
def speech_at(lines,cid,t,intensity):
    k=int(t*16000)
    for l,start,end,v in lines:
        if l["speakerId"]==cid and start<=k<end:
            samples=v[max(0,k-start-240):min(len(v),k-start+240)]
            amp=math.sqrt(sum(x*x for x in samples)/max(1,len(samples)))
            return min(1,amp/2200*intensity)
    return 0
def art_for(character,placement):
    a=character["artwork"]
    if placement.get("outfitId"):a=next(o for o in a.get("outfits",[]) if o["id"]==placement["outfitId"])
    pictures={i["pose"]:img(i["image"]) for i in a["images"]}
    rig={i["part"]:(img(i["image"]),i["pivotX"],i["pivotY"]) for i in a.get("rig",[])}
    return pictures,rig
def rig_frame(rig,size,t,action,gesture,amp):
    # Common registration canvas, transparent artwork. Rotate disconnected limb layers around artist-specified pivots.
    w,h=size;c=Image.new("RGBA",size)
    walk=action in ("walk","stairs-up","stairs-down")
    swing=math.sin(t*2*math.pi*1.35)*20 if walk else 0
    g=math.sin(t*2.9)
    angles={"left-leg":swing,"right-leg":-swing,"left-arm":-swing*.6,"right-arm":swing*.6,"head":g*1.5}
    if action=="sit":angles.update({"left-leg":-36,"right-leg":36})
    if gesture=="wave":angles["right-arm"]=-62+g*15
    elif gesture=="point":angles["right-arm"]=-47
    elif gesture=="explain":angles.update({"left-arm":12+g*8,"right-arm":-17-g*8})
    for part in ["left-leg","right-leg","left-arm","torso","right-arm","head","eyes-closed","mouth-open"]:
        if part not in rig:continue
        if part=="mouth-open" and amp<.15:continue
        if part=="eyes-closed" and t%4.2>.12:continue
        im,px,py=rig[part];im=im.resize(size,Image.Resampling.BILINEAR)
        angle=angles.get("head" if part in ("mouth-open","eyes-closed") else part,0)
        if angle:
            if part in ("mouth-open","eyes-closed"):_,px,py=rig["head"]
            im=im.rotate(angle,Image.Resampling.BILINEAR,center=(px*w,py*h))
        c.alpha_composite(im)
    return c
def actor(canvas,placement,pictures,rig,amp,t,duration,n,medium=False):
    w,h=canvas.size;action=placement.get("action") or placement.get("pose") or "stand";gesture=placement["gesture"];x=SLOTS[placement["position"]]*w;y=h*.87
    if medium:
        x=w*.5+(x-w*.5)*.72
        y=h*.93
    height=min(h*(.84 if medium else .70),w*.54/max(1,n*.55)*pictures["stand"].height/pictures["stand"].width)
    stand=pictures["stand"]
    if action in ("enter","exit"):
        offset=(1-min(1,t/1.3)) if action=="enter" else min(1,max(0,(t-duration+1.3)/1.3))
        x+=(-1 if x<w/2 else 1)*w*.8*offset
    if action in ("walk","stairs-up","stairs-down"):
        x+=math.sin(t*1.2)*w*.055
        if action.startswith("stairs"):y+=(-1 if action=="stairs-up" else 1)*h*.13*(t/duration-.5)
    if action=="sit":y+=h*.035
    y+=math.sin(t*3)*h*.002
    if rig and action not in ("eat","enter","exit","think","tablet"):
        body=rig_frame(rig,(max(1,round(height*stand.width/stand.height)),max(1,round(height))),t,action,gesture,amp)
        canvas.alpha_composite(body,(round(x-body.width/2),round(y-body.height)))
    else:
        pose=stand
        if action in ("walk","stairs-up","stairs-down"):pose=pictures.get("walk-a" if int(t*3.2)%2==0 else "walk-b",stand)
        elif action in ("sit","enter","exit","eat","think","tablet"):pose=pictures.get(action,stand)
        elif gesture!="idle":pose=pictures.get(gesture,stand) # Hold complete illustrated pose; never crossfade incompatible silhouettes.
        if amp>.15 and action=="stand" and gesture=="idle":pose=pictures.get("talk-open",pose) # Avoid translucent double faces and limbs.
        place(canvas,pose,x,y,height)
def label(canvas,text,position):
    if not text:return
    d=ImageDraw.Draw(canvas);w,h=canvas.size;f=ImageFont.truetype(FONT,max(22,int(w*.037)))
    b=d.textbbox((0,0),text,font=f);x=w/2;y={"top":h*.09,"middle":h*.5,"bottom":h*.92}[position]
    tw=min(w-24,b[2]-b[0]+38);th=b[3]-b[1]+24
    d.rounded_rectangle((x-tw/2,y-th/2,x+tw/2,y+th/2),radius=14,fill=(17,25,45,225));d.text((x,y),text,font=f,anchor="mm",fill="white")
def render(plan,voice,folder,cancelled,stage=lambda _:None,resolution=1080):
    a=plan["animation"]; size=(resolution,round(resolution*16/9)) if plan["campaign"]["format"]=="9:16" else (round(resolution*16/9),resolution)
    if any(k%2 for k in size):raise ValueError("Invalid resolution")
    stage("layered_voices")
    prepared=[(s,plan["scenes"][s["sceneIndex"]],*audio_for_scene(s,plan["scenes"][s["sceneIndex"]],voice,folder,a["speechVolume"],a["music"],a["musicVolume"],a.get("musicTrack"))) for s in sorted(a["shots"],key=lambda s:s["sceneIndex"])]
    stage("layered_rendering"); files=[]
    for shot,scene,audio,lines in prepared:
        if cancelled():raise RuntimeError("cancelled")
        bg=background(size,shot); full=shot.get("artwork",{}).get("mode")=="full"
        actors=[] if full else [(p,*art_for(next(c for c in a["cast"] if c["id"]==p["characterId"]),p)) for p in shot["placements"]]
        props=[(p,img(p["image"]),img(p["stateImage"]) if p.get("stateImage") else None) for p in shot.get("props",[])]
        out=folder/("scene-"+str(shot["sceneIndex"])+".mp4")
        cmd=["ffmpeg","-nostdin","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgba","-s",f"{size[0]}x{size[1]}","-r",str(FPS),"-i","-","-i",str(audio),"-c:v","libx264","-threads","2","-preset","veryfast","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-shortest","-movflags","+faststart",str(out)]
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        try:
            for frame in range(scene["seconds"]*FPS):
                if cancelled():raise RuntimeError("cancelled")
                t=frame/FPS; c=bg.copy();w,h=size
                def draw_props(front):
                    for p,im,state in props:
                        if p["foreground"]!=front:continue
                        x=p["x"];dt=max(0,t-p.get("motionStart",0));motion=p.get("motion","static")
                        if motion=="drive":x+=dt*.2
                        if motion in ("open","close") and state is not None:
                            k=min(1,dt/.45);im=blend(im,state,k if motion=="open" else 1-k)
                        height=min(h*p["size"],w*p["size"]*im.height/im.width);place(c,im,w*x,h*p["y"],height)
                draw_props(False)
                medium=scene.get("camera")=="medium" and not full and len(actors)<=2
                for p,pics,rig in actors:actor(c,p,pics,rig,speech_at(lines,p["characterId"],t,a["mouthIntensity"]),t,scene["seconds"],len(actors),medium)
                draw_props(True)
                # Medium presentation framing, focused on faces and upper bodies.
                if medium:
                    f=1.4;cw,ch=round(w*f),round(h*f)
                    enlarged=c.resize((cw,ch),Image.Resampling.LANCZOS)
                    left=(cw-w)//2;top=round((ch-h)*.18)
                    c=enlarged.crop((left,top,left+w,top+h))
                if scene["motion"]!="static":
                    f=1+.06*(t/scene["seconds"] if scene["motion"]=="zoom-in" else 1-t/scene["seconds"]);c=ImageOps.fit(c.resize((round(w*f),round(h*f)),Image.Resampling.BILINEAR),size) if f==1 else c.resize((round(w*f),round(h*f)),Image.Resampling.BILINEAR).crop(((round(w*f)-w)//2,(round(h*f)-h)//2,(round(w*f)+w)//2,(round(h*f)+h)//2))
                if scene.get("caption"):label(c,scene["caption"],"top")
                for s in shot.get("screenTexts",[]):
                    if s["start"]<=t<s["end"]:label(c,s["text"],s["position"])
                if a["subtitles"]:
                    for l,start,end,_ in lines:
                        if start<=t*16000<end:label(c,l["text"],"bottom")
                proc.stdin.write(c.tobytes())
            proc.stdin.close()
            if proc.wait(timeout=90)!=0:raise RuntimeError("Encoder failed")
        finally:
            if proc.poll() is None:proc.kill();proc.wait()
        files.append(out)
    listing=folder/"concat.txt";listing.write_text("\n".join("file '"+p.name+"'" for p in files))
    final=folder/"master.mp4"
    subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","1","-i",str(listing),"-c","copy","-movflags","+faststart",str(final)],check=True,timeout=60)
    if final.stat().st_size>25*1024*1024:raise RuntimeError("Video too large")
    return final


import base64, io, json, math, subprocess, tempfile, unittest, wave, array
from pathlib import Path
from PIL import Image, ImageDraw
from render import render
def pic(color, size=(160,240)):
    image=Image.new("RGBA",size);draw=ImageDraw.Draw(image);draw.rounded_rectangle((15,15,size[0]-15,size[1]-15),radius=22,fill=color)
    b=io.BytesIO();image.save(b,format="WEBP");return base64.b64encode(b.getvalue()).decode()
def audio():
    b=io.BytesIO()
    with wave.open(b,"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000);f.writeframes(array.array("h",[int(2500*math.sin(i*.08)) for i in range(16000)]).tobytes())
    return b.getvalue()
class RenderTest(unittest.TestCase):
    def test_multi_scene_cpu_output(self):
        art={"images":[{"pose":p,"image":pic(c)} for p,c in [("stand","blue"),("talk-open","red"),("walk-a","green"),("walk-b","orange")]]}
        shots=[]
        for i in range(2):
            shots.append({"sceneIndex":i,"background":"office","placements":[{"characterId":"c","position":"center","gesture":"idle","action":"stand" if i==0 else "walk"}],"dialogue":[{"id":f"line{i}","speakerId":"c","start":.3,"text":"أهلًا بكم"}],"props":[{"image":pic("brown"),"stateImage":pic("yellow"),"motion":"open","x":.15,"y":.7,"size":.3,"foreground":False}],"effect":{"audio":base64.b64encode(audio()).decode()}})
        plan={"campaign":{"format":"16:9"},"scenes":[{"seconds":2,"motion":"static"}]*2,"animation":{"cast":[{"id":"c","artwork":art}],"shots":shots,"speechVolume":1,"music":True,"musicVolume":.1,"musicTrack":{"audio":base64.b64encode(audio()).decode()},"mouthIntensity":1,"subtitles":True}}
        with tempfile.TemporaryDirectory() as temp:
            result=render(plan,lambda _:audio(),Path(temp),lambda:False,resolution=1080)
            probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(result)]))
            video=next(s for s in probe["streams"] if s["codec_type"]=="video")
            self.assertEqual((video["width"],video["height"]),(1920,1080))
            self.assertTrue(any(s["codec_type"]=="audio" for s in probe["streams"]))
            self.assertAlmostEqual(float(probe["format"]["duration"]),4,delta=.2)
if __name__=="__main__":unittest.main()

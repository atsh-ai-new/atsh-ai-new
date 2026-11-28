import math,unittest
from array import array
from PIL import Image,ImageDraw
from speech_motion import aperture,at,mouth_overlay
from render import speech_at
def signal():
    data=array("h")
    for n in range(16000):
        t=n/16000
        if .2<t<.36:value=3200*math.sin(2*math.pi*170*t)
        elif .39<t<.64:value=3600*math.sin(2*math.pi*740*t)+1500*math.sin(2*math.pi*1300*t)
        else:value=0
        data.append(int(value))
    return data
class SpeechMotion(unittest.TestCase):
    def test_acoustic_closure_vowel_and_silence(self):
        data=signal();a=aperture(data)
        self.assertEqual(len(a),100)
        self.assertEqual(at(a,1600),0)
        self.assertEqual(at(a,14000),0)
        self.assertGreater(at(a,8000),.75)
        self.assertLess(at(a,4600),.24)
        self.assertEqual(at(a,len(data)),0)
        self.assertEqual(aperture(array("h",[0])*400), (0.,0.,0.))
    def test_exact_line_offsets_and_speaker(self):
        v=signal();line={"id":"a","speakerId":"n"}
        tracks={"a":aperture(v)}
        l=[(line,8000,24000,v)]
        self.assertEqual(speech_at(l,"other",1,1,tracks),0)
        self.assertEqual(speech_at(l,"n",.1,1,tracks),0)
        self.assertAlmostEqual(speech_at(l,"n",1.,1,tracks),at(tracks["a"],8000))
    def test_mutates_aperture_not_registration(self):
        im=Image.new("RGBA",(210,390))
        d=ImageDraw.Draw(im)
        d.rectangle((91,130,116,155),fill="#ab7962")
        d.ellipse((94,136,113,150),fill="#411a1a")
        close=mouth_overlay(im,.22);full=mouth_overlay(im,1.)
        self.assertIsNone(mouth_overlay(im,0.))
        self.assertEqual(close.getbbox(),full.getbbox())
        self.assertNotEqual(close.tobytes(),full.tobytes())
if __name__=="__main__":unittest.main()

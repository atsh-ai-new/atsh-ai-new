import math,unittest
from PIL import Image,ImageDraw
from grounded_step import Step,direction,PARTS
def rig():
    size=(240,450)
    art={}
    for part,rect,pivot,col in [
        ('left-leg',(70,211,109,432),(.37,.47),'red'),
        ('right-leg',(129,211,173,432),(.63,.47),'blue'),
        ('torso',(65,95,175,226),(.5,.32),'gray'),
        ('head',(83,33,154,100),(.5,.21),'orange')]:
        im=Image.new('RGBA',size)
        d=ImageDraw.Draw(im)
        if part in PARTS:
            x,y,r,b=rect; d.polygon([(x,y),(r,y),(r-4,b-19),(r+9,b-14),(r+9,b),(x+4,b),(x+9,b-24),(x+3,y+89)],fill=col)
        else:d.rectangle(rect,fill=col)
        art[part]=(im,*pivot)
    return art
class Grounded(unittest.TestCase):
    def test_directed_and_ambiguous(self):
        self.assertEqual(direction('نور تاخد خطوة واحدة ناحية الشمال.'),-1)
        self.assertEqual(direction('خُطوة جانبية لليمين وبعدين تقف'),1)
        self.assertEqual(direction('take a step to the left'),-1)
        for s in ['المشي خطوة بخطوة','من غير خطوة ناحية الشمال','خطوة يمين أو خطوة شمال','خطوة ناحية الجمهور','يسار']:
            self.assertEqual(direction(s),0,s)
    def test_world_contacts_and_knee_chain(self):
        for sign in (-1,1):
            step=Step(rig(),sign,(310,580))
            p=step.lead; support=1-p
            for i in range(131):
                t=i/60
                h,f=step.pose(t)
                self.assertEqual(f[support],(0,0))
                if t>=.94:self.assertAlmostEqual(f[p][0],step.travel);self.assertEqual(f[p][1],0)
                for leg,foot in zip(step.legs,f):
                    hip,knee,ankle=leg.controls(h,foot)
                    self.assertAlmostEqual(math.dist(hip,knee),leg.l1,places=4)
                    self.assertAlmostEqual(math.dist(knee,ankle),leg.l2,places=4)
                    u=(ankle[0]-hip[0],ankle[1]-hip[1]);v=(knee[0]-hip[0],knee[1]-hip[1])
                    self.assertGreaterEqual((u[0]*v[1]-u[1]*v[0])*leg.side,-.0001)
            self.assertLess(step.pose(.65)[1][p][1],-5)
            leg=step.legs[support]
            q=(0,leg.bottom-10,step.size[0],leg.bottom)
            for t in (.35,.65,.95,1.58):
                c=Image.new("RGBA",step.size);h,f=step.pose(t);leg.draw(c,h,f[support])
                self.assertEqual(leg.im.crop(q).tobytes(),c.crop(q).tobytes())
if __name__=="__main__":unittest.main()

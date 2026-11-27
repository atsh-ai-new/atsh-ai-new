import hashlib,json,tempfile,unittest
from pathlib import Path
from pronunciation_trial import GUIDED
from pronunciation_review import evaluate
from family_review import normalize
from egyptian_voice_trial import DIALOGUES
class PronunciationTests(unittest.TestCase):
    def test_hints_preserve_words(self):
        for dialect,hint in GUIDED.items():
            self.assertEqual(normalize(hint),normalize(DIALOGUES[dialect][1]))
    def test_ab_comparison_no_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);baseline=root/"baseline";baseline.mkdir();out=root/"out";out.mkdir()
            id="egyptian-male"
            reference=baseline/(id+"-reference.wav");reference.write_bytes(b"reference")
            old=baseline/(id+"-dialogue.wav");old.write_bytes(b"old")
            new=out/(id+"-guided.wav");new.write_bytes(b"guided")
            target=DIALOGUES["egyptian"][1]
            row={"voiceId":id,"status":"generated","text":target,"sha256":hashlib.sha256(new.read_bytes()).hexdigest(),"referenceSha256":hashlib.sha256(reference.read_bytes()).hexdigest()}
            (out/"pronunciation-metrics.json").write_text(json.dumps([row]))
            result=evaluate(baseline,out,"egyptian",lambda path:target if path==new else target.replace("نجربها","نقربها"))
            self.assertEqual(result["improved"],1);self.assertEqual(result["comparable"],1)
            self.assertEqual(result["productionApproved"],0)
            self.assertEqual(len(list((out/"listening-pairs").glob("*.wav"))),2)
if __name__=="__main__":unittest.main()

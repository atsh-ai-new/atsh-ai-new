import hashlib,json,tempfile,unittest
from pathlib import Path
from family_review import review
from egyptian_voice_trial import ROLES,DIALOGUES
class ReviewTests(unittest.TestCase):
    def test_complete_pairs_only_and_no_automatic_approval(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            rows=[]
            transcripts={}
            for role in ROLES:
                for i,stage in enumerate(("reference","dialogue")):
                    key="egyptian-"+role+"-"+stage
                    path=root/(key+".wav")
                    path.write_bytes(key.encode())
                    text=DIALOGUES["egyptian"][i]
                    transcripts[path.name]=text
                    rows.append({"sample":key,"voiceId":"egyptian-"+role,"stage":stage,"text":text,
                                 "sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
            (root/"metrics.json").write_text(json.dumps(rows))
            # A whistle/transcription failure removes the whole pair; one tampered file also fails.
            transcripts["egyptian-child-male-dialogue.wav"]=""
            (root/"egyptian-teen-female-reference.wav").write_bytes(b"tampered")
            result=review(root,"egyptian",lambda path:transcripts[path.name])
            self.assertEqual(result["machinePassed"],4)
            self.assertEqual(result["productionApproved"],0)
            self.assertEqual(len(list((root/"review-candidates").glob("*.wav"))),8)
            self.assertTrue(all("child-male" not in p.name and "teen-female" not in p.name for p in (root/"review-candidates").glob("*.wav")))
    def test_missing_generation_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            r=review(d,"saidi",lambda path:"")
            self.assertEqual(r["machinePassed"],0)
            self.assertEqual(len(r["identities"]),6)
if __name__=="__main__":unittest.main()

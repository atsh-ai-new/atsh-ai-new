import json,tempfile,unittest,wave
from pathlib import Path
from service import registry,synthesize,EGYPTIAN_IDS,IDS
from audar_backend import make_prompt,generate_speech_codes
class StubLlama:
    def __init__(self,tokens):self.tokens=tokens
    def tokenize(self,body,**kwargs):return [999] if body==b"<|TARGET_CODES_END|>" else [1,2]
    def generate(self,*a,**kw):return iter(self.tokens)
    def detokenize(self,tokens,**kw):return (f"<|speech_{tokens[0]}|>" if tokens[0]>=0 else "bad").encode()
class VoiceTests(unittest.TestCase):
    def setUp(self):
        self.dir=tempfile.TemporaryDirectory(); self.root=Path(self.dir.name)
        (self.root/"voice.onnx").write_bytes(b"fixture, not a neural model")
        (self.root/"voice.onnx.json").write_text('{"num_speakers":2}')
        (self.root/"model.gguf").write_bytes(b"fixture")
        (self.root/"codec").mkdir()
        with wave.open(str(self.root/"ref.wav"),"wb") as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000);f.writeframes(bytes(16000*2*5))
    def tearDown(self):self.dir.cleanup()
    def test_egyptian_voice_matrix(self):
        self.assertEqual(len(EGYPTIAN_IDS),18)
        self.assertEqual(len(IDS),24)
        profiles=json.loads(Path(__file__).with_name("profiles.example.json").read_text())
        self.assertEqual(set(profiles),IDS)
        self.assertTrue(all(p["approved"] is False for p in profiles.values()))
    def test_youth_reference_consent(self):
        c={"engine":"audar","model":"model.gguf","codec":"codec","reference":"ref.wav","transcript":"أهلًا","approved":True,"commercialRights":True}
        with self.assertRaisesRegex(ValueError,"guardian"):
            registry(self.root,{"saidi-child-female":c})
        self.assertIn("saidi-child-female",registry(self.root,{"saidi-child-female":{**c,"guardianConsent":True}}))
        self.assertIn("egyptian-teen-male",registry(self.root,{"egyptian-teen-male":{**c,"source":"synthetic"}}))
    def test_candidates_not_live(self):
        c={"egyptian-male":{"model":"voice.onnx","speaker":0,"approved":False}}
        self.assertEqual(registry(self.root,c),{})
        self.assertEqual(list(registry(self.root,c,True)),["egyptian-male"])
    def test_no_aliases_or_wrong_speaker(self):
        c={"model":"voice.onnx","speaker":0,"approved":True}
        with self.assertRaises(ValueError):registry(self.root,{"egyptian-male":c,"saidi-female":c})
        with self.assertRaises(ValueError):registry(self.root,{"egyptian-male":{**c,"speaker":2}})
        self.assertEqual(len(registry(self.root,{"egyptian-male":c,"egyptian-female":{**c,"speaker":1}})),2)
    def test_reference_permission_and_duplicates(self):
        c={"engine":"audar","model":"model.gguf","codec":"codec","reference":"ref.wav","transcript":"أهلًا","approved":True}
        with self.assertRaises(ValueError):registry(self.root,{"saidi-female":c})
        c["commercialRights"]=True
        self.assertIn("saidi-female",registry(self.root,{"saidi-female":c}))
        with self.assertRaises(ValueError):registry(self.root,{"saidi-female":c,"alexandrian-male":c})
    def test_rejected_model_cannot_be_enabled_or_auditioned(self):
        from unittest.mock import patch
        c={"model":"voice.onnx","speaker":0,"approved":True}
        with patch("service.sha",return_value="1578a9b27d01a0626227225b148179628b770607dd61bdbbc41865bd399106b1"):
            for candidate in (False,True):
                with self.assertRaisesRegex(ValueError,"rejected"):registry(self.root,{"gulf-female":c},candidate)
    def test_provisional_voicetut_is_opt_in(self):
        import hashlib,os
        from unittest.mock import patch
        (self.root/"voicetut").mkdir()
        ref=self.root/"ref.wav"
        c={"engine":"voicetut","model":"voicetut","reference":"ref.wav","referenceSha256":hashlib.sha256(ref.read_bytes()).hexdigest(),"transcript":"أهلًا","source":"synthetic","commercialRights":True,"approved":False,"provisional":True}
        with patch.dict(os.environ,{"ENABLE_PROVISIONAL_EGYPTIAN":"0"}):
            self.assertEqual(registry(self.root,{"egyptian-male":c}),{})
        with patch.dict(os.environ,{"ENABLE_PROVISIONAL_EGYPTIAN":"1"}):
            self.assertTrue(registry(self.root,{"egyptian-male":c})["egyptian-male"]["provisional"])
            with self.assertRaisesRegex(ValueError,"rights"):
                registry(self.root,{"egyptian-male":{**c,"commercialRights":False}})
            with self.assertRaisesRegex(ValueError,"digest"):
                registry(self.root,{"egyptian-male":{**c,"referenceSha256":"bad"}})
    def test_no_silent_fallback(self):
        with self.assertRaisesRegex(ValueError,"Unavailable voice"):synthesize({},{"voiceId":"saidi-female","text":"أهلًا"})
    def test_prompt_and_decoder(self):
        self.assertIn("<|speech_12|>",make_prompt("أهلًا","مرحبا",[12]))
        with self.assertRaises(ValueError):make_prompt("<|TARGET_CODES_END|>","مرحبا",[12])
        self.assertEqual(generate_speech_codes(StubLlama([2]*10+[999]),"prompt"),[2]*10)
        with self.assertRaises(ValueError):generate_speech_codes(StubLlama([2]*10),"prompt")
        with self.assertRaises(ValueError):generate_speech_codes(StubLlama([-1,999]),"prompt")
if __name__=="__main__":unittest.main()


import json, math, tempfile, unittest, wave
from array import array
from pathlib import Path
from prepare_reference import prepare
class ReferenceTests(unittest.TestCase):
    def test_import_no_activation_no_duplicate_or_live_replacement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            cfg=root/"profiles.json";cfg.write_text("{}")
            consent=root/"consent.txt";consent.write_text("Test fixture consent only")
            raw=root/"test.wav"
            with wave.open(str(raw),"wb") as w:
                w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000)
                w.writeframes(array("h",(int(2000*math.sin(i/10)) for i in range(16000*6))).tobytes())
            path=prepare(root,"egyptian-male",raw,"أهلًا",consent)
            data=json.loads(cfg.read_text())
            self.assertTrue((root/path).exists())
            self.assertTrue(data["egyptian-male"]["commercialRights"])
            self.assertFalse(data["egyptian-male"]["approved"])
            with self.assertRaisesRegex(ValueError,"another voice"):
                prepare(root,"egyptian-female",raw,"أهلًا",consent)
            data["egyptian-male"]["approved"]=True
            cfg.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,"live"):
                prepare(root,"egyptian-male",raw,"أهلًا",consent)
if __name__=="__main__":unittest.main()

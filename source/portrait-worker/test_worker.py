import argparse
import base64
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from pathlib import Path

import worker


class WorkerTests(unittest.TestCase):
    def test_invalid_job_rejected(self):
        with self.assertRaises(ValueError):
            worker.validate_job({"id":"invalid","jobToken":"a"*64})
        with self.assertRaises(ValueError):
            worker.validate_job({"id":"00000000-0000-4000-8000-000000000001","jobToken":"a"*64,"seconds":8,"start":9,"speechVolume":1})

    def test_cancel_prevents_subprocess(self):
        cancelled=threading.Event()
        cancelled.set()
        with self.assertRaises(RuntimeError):
            worker.run(["this-command-must-not-run"],cancelled)

    def test_speech_timing(self):
        active, pre, post = worker.speech_render_timing(2.56, 8, 0)
        self.assertEqual((active, pre), (2.76, 0))
        self.assertAlmostEqual(post, 5.24)
        self.assertEqual(worker.speech_render_timing(2.56, 8, 0, True), (8, 0, 0))
        with self.assertRaises(ValueError):
            worker.speech_render_timing(9, 8, 0)

    def test_single_face_gate(self):
        worker.validate_face_geometry([(20,20,120,120)], 320, 320)
        for faces in [[], [(0,0,60,60),(100,100,80,80)], [(0,0,24,24)]]:
            with self.assertRaises(ValueError):
                worker.validate_face_geometry(faces, 320, 320)

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"),"FFmpeg required")
    def test_media_pipeline_with_stub_not_ai(self):
        # The stub only verifies adapter, timing, normalization and MP4 output.
        # This test makes no assertion about AI motion quality.
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp)
            model=d/"model"
            model.mkdir()
            (model/"inference.py").write_text(
                "import argparse,subprocess,pathlib\n"
                "p=argparse.ArgumentParser()\n"
                "for k in ['source_image','driven_audio','result_dir','size','batch_size','preprocess']: p.add_argument('--'+k)\n"
                "p.add_argument('--cpu',action='store_true'); a=p.parse_args()\n"
                "subprocess.check_call(['ffmpeg','-loglevel','error','-y','-loop','1','-i',a.source_image,'-i',a.driven_audio,'-shortest','-c:v','libx264','-pix_fmt','yuv420p',str(pathlib.Path(a.result_dir)/'sample.mp4')])\n",
                encoding="utf8")
            img,aud=d/"photo.webp",d/"input.wav"
            subprocess.check_call(["ffmpeg","-loglevel","error","-y","-f","lavfi","-i","color=c=blue:s=128x128","-frames:v","1",str(img)])
            subprocess.check_call(["ffmpeg","-loglevel","error","-y","-f","lavfi","-i","sine=frequency=440:duration=1","-c:a","pcm_s16le",str(aud)])
            job={"id":"00000000-0000-4000-8000-000000000001","jobToken":"a"*64,"seconds":3,"start":.3,"speechVolume":1,
                 "image":base64.b64encode(img.read_bytes()).decode(),"audio":base64.b64encode(aud.read_bytes()).decode()}
            self.assertEqual(worker.validate_job(job)[2:],(3,.3,1))
            args=argparse.Namespace(ffmpeg="ffmpeg",ffprobe="ffprobe",model_dir=model,python=sys.executable,device="cpu")
            with patch.object(worker, "check_portrait"):
                output=worker.render(args,d,img,aud,3,.3,1,threading.Event())
            self.assertLess(float(worker.probe(args,d/"active.wav")["format"]["duration"]), 1.3)
            self.assertEqual(output.read_bytes()[4:8],b"ftyp")
            info=worker.probe(args,output)
            self.assertAlmostEqual(float(info["format"]["duration"]),3,delta=.35)
            self.assertEqual({x["codec_type"] for x in info["streams"]},{"video","audio"})


if __name__=="__main__":
    unittest.main()

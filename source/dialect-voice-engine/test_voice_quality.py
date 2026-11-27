import unittest
import numpy as np
from voice_quality import check_signal
class SignalTests(unittest.TestCase):
    def test_whistle_regression(self):
        for rate in (16000,24000):
            t=np.arange(rate*3)/rate
            tones=.07*np.sin(2*np.pi*4800*t)
            if rate==24000:tones+=.09*np.sin(2*np.pi*9600*t)
            with self.assertRaisesRegex(ValueError,"Non-speech"):check_signal(tones,rate)
    def test_broad_voice_band_not_rejected(self):
        rate=24000;t=np.arange(rate*3)/rate
        x=sum(.025*np.sin(2*np.pi*(f*t+12*np.sin(2*np.pi*.7*t))) for f in (190,380,570,760,950,1330,1710,2090))
        self.assertGreater(check_signal(x,rate)["speechBandRatio"],.9)
    def test_silence_and_clipping(self):
        for x in (np.zeros(24000), np.ones(24000)):
            with self.assertRaises(ValueError):check_signal(x,24000)

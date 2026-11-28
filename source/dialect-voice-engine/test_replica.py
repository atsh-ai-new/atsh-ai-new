import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from replica_backend import plain
from service import registry


class ReplicaTest(unittest.TestCase):
    def test_removes_marks_without_changing_letters_or_punctuation(self):
        self.assertEqual(plain("  هَنـجَرَّب حَاجَة جَدِيدَة؟ "), "هنجرب حاجة جديدة؟")

    def test_does_not_advertise_candidates(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(registry(tmp, {"egyptian-male": {
                "engine": "replica", "model": "absent.gguf", "approved": False
            }}), {})

    def test_requires_verified_model_and_restricts_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "model.gguf").write_bytes(b"fixture")
            profile = {"engine": "replica", "model": "model.gguf", "approved": True}
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                registry(tmp, {"egyptian-male": profile})
            with self.assertRaisesRegex(ValueError, "Unreviewed"):
                registry(tmp, {"egyptian-teen-female": profile})
            with patch("service.REPLICA_Q4_SHA256",
                       "f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d"):
                self.assertEqual(registry(tmp, {"egyptian-male": profile})["egyptian-male"]["engine"], "replica")

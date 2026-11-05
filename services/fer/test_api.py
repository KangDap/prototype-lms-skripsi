"""HTTP/error contracts plus optional inference with the real local ONNX weights."""

import os
import unittest
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from unittest.mock import Mock

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app import create_app
from pipeline import BusyError, FERPipeline, LABELS, MAX_FRAME_BYTES, MODEL_NAME, Prediction, largest_face


def jpeg(frame=None):
    if frame is None:
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
    return cv2.imencode(".jpg", frame)[1].tobytes()


class APIContractTests(unittest.TestCase):
    def setUp(self):
        self.pipeline = Mock(detector_name="haar")
        self.pipeline.predict.return_value = Prediction(
            status="no_face", face_detected=False, face_count=0,
            timestamp=datetime.now(timezone.utc), latency_ms=1, detector="haar",
        )
        self.factory = Mock(return_value=self.pipeline)
        self.client = TestClient(create_app(self.factory))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.pipeline.close.assert_called_once()

    def post(self, data=b"jpeg", **kwargs):
        return self.client.post("/predict", content=data, headers={"Content-Type": "image/jpeg"}, **kwargs)

    def test_health_and_single_load(self):
        for _ in range(2):
            body = self.client.get("/health").json()
            self.assertEqual(body["labels"], list(LABELS))
            self.assertEqual(body["model"], MODEL_NAME)
        self.factory.assert_called_once()

    def test_no_face_is_not_neutral(self):
        response = self.post()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        body = response.json()
        self.assertEqual(body["status"], "no_face")
        self.assertFalse(body["face_detected"])
        self.assertIsNone(body["emotion"])
        self.assertIsNone(body["confidence"])
        self.assertIsNone(body["probabilities"])

    def test_rejects_empty_wrong_type_and_oversized_frames(self):
        self.assertEqual(self.post(b"").status_code, 400)
        self.assertEqual(self.client.post("/predict", json={"frame": "no"}).status_code, 415)
        self.assertEqual(self.post(b"x" * (MAX_FRAME_BYTES + 1)).status_code, 413)
        self.pipeline.predict.assert_not_called()

    def test_bad_frame_busy_and_inference_failure(self):
        for error, status in [(ValueError("Invalid JPEG"), 400), (BusyError(), 429), (RuntimeError("private error"), 500)]:
            self.pipeline.predict.side_effect = error
            with self.subTest(status=status):
                response = self.post()
                self.assertEqual(response.status_code, status)
                if status == 500:
                    self.assertNotIn("private error", response.text)

    def test_cors_origin_allowlist(self):
        for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
            response = self.client.options("/predict", headers={
                "Origin": origin, "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            })
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["access-control-allow-origin"], origin)
        self.assertEqual(self.client.post("/predict", content=b"private frame", headers={
            "Origin": "https://untrusted.example", "Content-Type": "image/jpeg",
        }).status_code, 403)
        self.pipeline.predict.assert_not_called()


class PipelineTests(unittest.TestCase):
    def setUp(self):
        # Isolate detector/model edge cases; real model tests are below.
        self.pipeline = object.__new__(FERPipeline)
        self.pipeline.detector_name = "haar"
        self.pipeline.detector = Mock()
        self.pipeline.detector.detectMultiScale.return_value = [(100, 100, 150, 150)]
        self.pipeline.recognizer = Mock()
        self.pipeline.lock = Lock()
        self.pipeline.recognizer.predict_emotions.return_value = (["Neutral"], np.array([[0, 0, 0, 0, 0, 1, 0, 0]], dtype=float))

    def test_rgb_crop_and_probabilities(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:, :, 2] = 255
        result = self.pipeline.predict(jpeg(frame))
        crop = self.pipeline.recognizer.predict_emotions.call_args.args[0]
        self.assertGreater(crop[0, 0, 0], 250)  # Red channel is now RGB[0].
        self.assertEqual(crop.shape, (150, 150, 3))
        self.assertEqual(self.pipeline.recognizer.predict_emotions.call_args.kwargs, {"logits": False})
        self.assertEqual(result.emotion, "Neutral")
        self.assertEqual(result.confidence, 1)
        self.assertEqual(tuple(result.probabilities), LABELS)

    def test_invalid_scores_do_not_become_neutral(self):
        for scores in [np.full((1, 8), np.nan), np.ones((1, 7)), np.ones((1, 8)), np.zeros((1, 8))]:
            self.pipeline.recognizer.predict_emotions.return_value = (["Neutral"], scores)
            result = self.pipeline.predict(jpeg())
            self.assertEqual(result.status, "invalid_prediction")
            self.assertTrue(result.face_detected)
            self.assertIsNone(result.emotion)
            self.assertIsNone(result.confidence)

    def test_no_face_skips_model_and_clears_prediction(self):
        self.assertEqual(self.pipeline.predict(jpeg()).status, "ok")
        self.pipeline.recognizer.reset_mock()
        self.pipeline.detector.detectMultiScale.return_value = []
        result = self.pipeline.predict(jpeg())
        self.assertEqual(result.status, "no_face")
        self.assertIsNone(result.emotion)
        self.pipeline.recognizer.predict_emotions.assert_not_called()

    def test_invalid_images_and_lock_recovery(self):
        for data in (b"broken", jpeg(np.zeros((1081, 10, 3), dtype=np.uint8))):
            with self.assertRaises(ValueError):
                self.pipeline.predict(data)
            self.assertFalse(self.pipeline.lock.locked())
        with self.pipeline.lock:
            with self.assertRaises(BusyError):
                self.pipeline.predict(jpeg())

    def test_largest_face_clips_and_skips_empty_boxes(self):
        self.assertEqual(largest_face([(-10, -10, 30, 30), (20, 20, 40, 40), (999, 999, 5, 5)], (100, 100, 3)), (20, 20, 60, 60))
        self.assertIsNone(largest_face([(101, 101, 1, 1)], (100, 100, 3)))


@unittest.skipUnless(os.getenv("FER_REAL_MODEL") == "1", "Set FER_REAL_MODEL=1 to test local ONNX weights")
class RealModelTests(unittest.TestCase):
    def test_real_model_through_http(self):
        with TestClient(create_app()) as client:
            blank = client.post("/predict", content=jpeg(), headers={"Content-Type": "image/jpeg"})
            self.assertEqual(blank.status_code, 200)
            self.assertEqual(blank.json()["status"], "no_face")
            image_path = os.getenv("FER_TEST_IMAGE")
            if image_path:
                response = client.post("/predict", content=Path(image_path).read_bytes(), headers={"Content-Type": "image/jpeg"})
                self.assertEqual(response.status_code, 200)
                body = response.json()
                self.assertEqual(body["status"], "ok")
                self.assertIn(body["emotion"], LABELS)
                self.assertAlmostEqual(sum(body["probabilities"].values()), 1, places=5)
                self.assertAlmostEqual(body["confidence"], max(body["probabilities"].values()), places=6)
                print("Real model + face detector:", body)
            else:
                # Real model inference on a synthetic crop; detector itself is not validated here.
                pipeline = client.app.state.pipeline
                rng = np.random.default_rng(42)
                _, scores = pipeline.recognizer.predict_emotions(rng.integers(0, 256, (160, 160, 3), dtype=np.uint8), logits=False)
                self.assertEqual(scores.shape, (1, 8))
                self.assertTrue(np.isfinite(scores).all())
                self.assertAlmostEqual(float(scores.sum()), 1, places=5)


if __name__ == "__main__":
    unittest.main()

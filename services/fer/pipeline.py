"""Runtime extraction of fer-playground/main.py; no experiment imports or downloads."""

import os
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Literal

import cv2
import numpy as np
from emotiefflib.facial_analysis import EmotiEffLibRecognizer
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from io import BytesIO

MODEL_NAME = "enet_b0_8_best_vgaf"
LABELS = ("Anger", "Contempt", "Disgust", "Fear", "Happiness", "Neutral", "Sadness", "Surprise")
Emotion = Literal["Anger", "Contempt", "Disgust", "Fear", "Happiness", "Neutral", "Sadness", "Surprise"]
MAX_FRAME_BYTES = 1_000_000


class Prediction(BaseModel):
    schema_version: Literal[1] = 1
    status: Literal["ok", "no_face", "invalid_prediction"]
    face_detected: bool
    face_count: int = Field(ge=0)
    emotion: Emotion | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    probabilities: dict[Emotion, float] | None = None
    timestamp: datetime
    latency_ms: float = Field(ge=0)
    model: Literal["enet_b0_8_best_vgaf"] = MODEL_NAME
    detector: Literal["haar", "mediapipe"]


class BusyError(Exception):
    pass


def largest_face(faces, frame_shape):
    """Same clipping and largest-face selection as the working experiment."""
    height, width = frame_shape[:2]
    valid = []
    for x, y, w, h in faces:
        x1, y1 = max(0, int(x)), max(0, int(y))
        x2, y2 = min(width, int(x + w)), min(height, int(y + h))
        if x2 > x1 and y2 > y1:
            valid.append((x1, y1, x2, y2))
    return max(valid, key=lambda box: (box[2] - box[0]) * (box[3] - box[1]), default=None)


def decode_frame(data: bytes):
    # Inspect dimensions before OpenCV allocates the decoded image. No disk writes.
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != "JPEG" or not (0 < image.width <= 1920 and 0 < image.height <= 1080):
                raise ValueError("Gunakan JPEG berukuran maksimal 1920 x 1080.")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("Frame JPEG tidak valid.") from error
    frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Frame JPEG tidak dapat dibaca.")
    return cv2.resize(frame, (640, 480))


class FERPipeline:
    def __init__(self):
        # EmotiEffLib 1.1.1 uses this cache. Fail explicitly instead of downloading.
        weights = Path.home() / ".emotiefflib" / f"{MODEL_NAME}.onnx"
        if not weights.is_file():
            raise FileNotFoundError(f"Weights lokal tidak ditemukan: {weights}. Lihat docs/fer-integration.md.")
        self.recognizer = EmotiEffLibRecognizer(engine="onnx", model_name=MODEL_NAME)
        actual_labels = tuple(self.recognizer.idx_to_emotion_class[i] for i in range(8))
        if actual_labels != LABELS:
            raise RuntimeError(f"Mapping label model berbeda: {actual_labels}")
        self.detector_name = os.getenv("FER_DETECTOR", "haar")
        self.lock = Lock()
        self.last_timestamp_ms = -1
        self.started_at = time.perf_counter()
        if self.detector_name == "haar":
            self.detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            if self.detector.empty():
                raise RuntimeError("Haar Cascade tidak tersedia.")
        elif self.detector_name == "mediapipe":
            import mediapipe as mp

            model_path = Path(os.environ["FER_FACE_MODEL"])
            if not model_path.is_file():
                raise FileNotFoundError(f"Model Face Detector tidak tersedia: {model_path}")
            self.mp = mp
            self.detector = mp.tasks.vision.FaceDetector.create_from_options(
                mp.tasks.vision.FaceDetectorOptions(
                    base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path.resolve()),
                                                     delegate=mp.tasks.BaseOptions.Delegate.CPU),
                    running_mode=mp.tasks.vision.RunningMode.VIDEO,
                    min_detection_confidence=0.5,
                )
            )
        else:
            raise ValueError("FER_DETECTOR harus haar atau mediapipe.")

    def close(self):
        if self.detector_name == "mediapipe":
            self.detector.close()

    def predict(self, data: bytes) -> Prediction:
        if not self.lock.acquire(blocking=False):
            raise BusyError("Inference sebelumnya masih berjalan.")
        started = time.perf_counter()
        try:
            frame = decode_frame(data)
            if self.detector_name == "haar":
                faces = self.detector.detectMultiScale(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY),
                                                      scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
            else:
                timestamp_ms = max(self.last_timestamp_ms + 1, int((time.perf_counter() - self.started_at) * 1000))
                self.last_timestamp_ms = timestamp_ms
                image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB,
                                      data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                result = self.detector.detect_for_video(image, timestamp_ms)
                faces = [(d.bounding_box.origin_x, d.bounding_box.origin_y,
                          d.bounding_box.width, d.bounding_box.height) for d in result.detections]
            box = largest_face(faces, frame.shape)
            fields = dict(face_detected=box is not None, face_count=len(faces) if box else 0,
                          timestamp=datetime.now(timezone.utc), detector=self.detector_name)
            if box is None:
                return Prediction(status="no_face", latency_ms=(time.perf_counter() - started) * 1000, **fields)
            x1, y1, x2, y2 = box
            rgb = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2RGB)
            # Library alone handles 224x224, /255, ImageNet mean/std, NCHW.
            emotions, probabilities = self.recognizer.predict_emotions(rgb, logits=False)
            values = np.asarray(probabilities)
            valid = (values.shape == (1, 8) and np.isfinite(values).all()
                     and (values >= 0).all() and (values <= 1).all()
                     and np.isclose(values.sum(), 1, atol=1e-4)
                     and len(emotions) == 1 and emotions[0] == LABELS[int(values.argmax())])
            if not valid:
                return Prediction(status="invalid_prediction", latency_ms=(time.perf_counter() - started) * 1000, **fields)
            return Prediction(status="ok", emotion=emotions[0], confidence=float(values.max()),
                              probabilities=dict(zip(LABELS, map(float, values[0]))),
                              latency_ms=(time.perf_counter() - started) * 1000, **fields)
        finally:
            self.lock.release()

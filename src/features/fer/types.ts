// Class order matches EmotiEffLib 1.1.1 enet_b0_8_best_vgaf exactly.
export const EMOTIONS = [
  "Anger", "Contempt", "Disgust", "Fear", "Happiness", "Neutral", "Sadness", "Surprise",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

type PredictionMetadata = {
  schema_version: 1;
  timestamp: string;
  latency_ms: number;
  face_count: number;
  model: "enet_b0_8_best_vgaf";
  detector: "haar" | "mediapipe";
};

export type FERPrediction = PredictionMetadata & (
  | {
      status: "ok";
      face_detected: true;
      emotion: Emotion;
      confidence: number;
      probabilities: Record<Emotion, number>;
    }
  | {
      status: "no_face";
      face_detected: false;
      emotion: null;
      confidence: null;
      probabilities: null;
    }
  | {
      status: "invalid_prediction";
      face_detected: true;
      emotion: null;
      confidence: null;
      probabilities: null;
    }
);

// Integration boundary for the future in-memory emotion aggregator.
export type FERSample = {
  sessionId: string;
  courseId: string;
  materialId: string;
  sequence: number;
  capturedAt: string;
  receivedAt: string;
  prediction: FERPrediction;
};

export type FERSnapshot = {
  status: "inactive" | "starting" | "active" | "error";
  sample: FERSample | null;
  error: string | null;
};

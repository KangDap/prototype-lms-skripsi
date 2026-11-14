import { EMOTIONS, type Emotion, type FERPrediction } from "../fer/types";

export type SimulationLabel = Emotion | "no_face" | "invalid_prediction" | "error";
export function createSyntheticPrediction(label: SimulationLabel, confidence = 0.82): FERPrediction | null {
  if (label === "error") return null;
  const metadata = { schema_version: 1 as const, timestamp: new Date().toISOString(), latency_ms: 0,
    face_count: label === "no_face" ? 0 : 1, model: "enet_b0_8_best_vgaf" as const, detector: "haar" as const };
  if (label === "no_face") return { ...metadata, status: "no_face", face_detected: false, emotion: null, confidence: null, probabilities: null };
  if (label === "invalid_prediction") return { ...metadata, status: "invalid_prediction", face_detected: true, emotion: null, confidence: null, probabilities: null };
  const probabilities = Object.fromEntries(EMOTIONS.map((emotion) => [emotion, emotion === label ? confidence : (1 - confidence) / 7])) as Record<Emotion, number>;
  return { ...metadata, status: "ok", face_detected: true, emotion: label, confidence, probabilities };
}

import { EMOTIONS, type FERPrediction } from "../fer/types";
import type { AffectiveState } from "./types";

export function mapPrediction(prediction: FERPrediction | null, confidenceThreshold: number): AffectiveState {
  if (!prediction || prediction.status !== "ok" || !prediction.face_detected ||
      !EMOTIONS.includes(prediction.emotion) || !Number.isFinite(prediction.confidence) ||
      prediction.confidence < confidenceThreshold || prediction.confidence > 1) return "UNKNOWN";
  if (prediction.emotion === "Surprise") return "AMBIGUOUS";
  if (prediction.emotion === "Neutral" || prediction.emotion === "Happiness") return "STABLE";
  return "NEGATIVE_AFFECT";
}

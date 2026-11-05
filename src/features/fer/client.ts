import { ferConfig } from "./config";
import { EMOTIONS, type FERPrediction } from "./types";

function probability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function parsePrediction(value: unknown): FERPrediction {
  const invalid = () => new Error("Format respons FER tidak valid atau versi kontrak berbeda.");
  if (!value || typeof value !== "object") throw invalid();
  const item = value as Record<string, unknown>;
  if (
    item.schema_version !== 1 || item.model !== "enet_b0_8_best_vgaf" ||
    !["haar", "mediapipe"].includes(String(item.detector)) ||
    typeof item.timestamp !== "string" || !Number.isFinite(Date.parse(item.timestamp)) ||
    typeof item.latency_ms !== "number" || !Number.isFinite(item.latency_ms) || item.latency_ms < 0 ||
    !Number.isInteger(item.face_count) || (item.face_count as number) < 0
  ) throw invalid();

  if (item.status === "ok") {
    if (
      item.face_detected !== true || (item.face_count as number) < 1 ||
      !EMOTIONS.includes(item.emotion as (typeof EMOTIONS)[number]) ||
      !probability(item.confidence) || !item.probabilities || typeof item.probabilities !== "object"
    ) throw invalid();
    const scores = item.probabilities as Record<string, unknown>;
    if (Object.keys(scores).length !== EMOTIONS.length || !EMOTIONS.every((label) => probability(scores[label]))) throw invalid();
    const values = EMOTIONS.map((label) => scores[label] as number);
    const maximum = Math.max(...values);
    if (
      Math.abs(values.reduce((sum, score) => sum + score, 0) - 1) > 0.0001 ||
      Math.abs(maximum - item.confidence) > 0.000001 ||
      item.emotion !== EMOTIONS[values.indexOf(maximum)]
    ) throw invalid();
  } else if (item.status === "no_face" || item.status === "invalid_prediction") {
    if (item.emotion !== null || item.confidence !== null || item.probabilities !== null) throw invalid();
    if (item.status === "no_face" && (item.face_detected !== false || item.face_count !== 0)) throw invalid();
    if (item.status === "invalid_prediction" && (item.face_detected !== true || (item.face_count as number) < 1)) throw invalid();
  } else {
    throw invalid();
  }
  return value as FERPrediction;
}

async function request(path: string, signal: AbortSignal, body?: Blob): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ferConfig.timeoutMs);
  try {
    const response = await fetch(`${ferConfig.apiUrl}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "image/jpeg" } : undefined,
      body,
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("Service FER sedang sibuk. Tunggu sejenak, lalu aktifkan kembali.");
      throw new Error(`Service FER mengembalikan error HTTP ${response.status}. Periksa terminal service.`);
    }
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut) throw new Error("Service FER melewati batas waktu. Kamera telah dihentikan; coba aktifkan kembali.");
    if (error instanceof TypeError) throw new Error("Service FER tidak terhubung. Pastikan service berjalan dan origin LMS diizinkan.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

export async function checkFERHealth(signal: AbortSignal) {
  const health = await request("/health", signal);
  if (!health || typeof health !== "object") throw new Error("Respons health FER tidak valid.");
  const item = health as Record<string, unknown>;
  if (item.status !== "ready" || item.schema_version !== 1 || item.model !== "enet_b0_8_best_vgaf" ||
      JSON.stringify(item.labels) !== JSON.stringify(EMOTIONS)) {
    throw new Error("Service FER belum siap atau mapping label model berbeda.");
  }
}

export async function predictFrame(frame: Blob, signal: AbortSignal) {
  return parsePrediction(await request("/predict", signal, frame));
}

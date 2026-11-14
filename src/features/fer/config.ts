import { INITIAL_AGGREGATION_CONFIG } from "../aui/config";

function milliseconds(value: string | undefined, fallback: number, minimum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

export const ferConfig = {
  apiUrl: (process.env.NEXT_PUBLIC_FER_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, ""),
  intervalMs: milliseconds(process.env.NEXT_PUBLIC_FER_INTERVAL_MS, INITIAL_AGGREGATION_CONFIG.samplingIntervalMs, 500),
  timeoutMs: milliseconds(process.env.NEXT_PUBLIC_FER_TIMEOUT_MS, 10000, 1000),
  width: 640,
  height: 480,
  jpegQuality: 0.85,
};

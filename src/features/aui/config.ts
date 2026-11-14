import type { AdaptiveUIConfig, AdaptiveUIMode, AggregationConfig } from "./types";

// Parameter desain awal; bukan threshold yang diturunkan dari literatur.
export const INITIAL_AGGREGATION_CONFIG: Readonly<AggregationConfig> = Object.freeze({
  samplingIntervalMs: 1000,
  windowDurationMs: 10000,
  confidenceThreshold: 0.6,
  minValidSamples: 8,
  negativeRatioThreshold: 0.6,
  stableRatioThreshold: 0.6,
  requiredConsecutiveWindows: 2,
  adaptationCooldownMs: 30000,
  recoveryDurationMs: 1000,
});

export function validateConfig(config: AggregationConfig) {
  if (config.negativeWindowPolicy !== undefined && config.negativeWindowPolicy !== "OCCURRENCE_ACCUMULATION") throw new Error("Unknown negative window policy.");
  const accumulation = config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION";
  if (config.minNegativeSamples !== undefined && (!Number.isInteger(config.minNegativeSamples) || config.minNegativeSamples < 1)) throw new Error("Invalid minimum negative samples.");
  if (accumulation && (config.minNegativeSamples === undefined || config.requiredConsecutiveWindows !== 1)) throw new Error("Occurrence accumulation requires a negative sample minimum and one qualifying window.");
  if (config.interactionPolicy !== undefined && config.interactionPolicy !== "USER_APPROVED_V1") throw new Error("Unknown AUI interaction policy.");
  for (const value of [config.offerTimeoutMs, config.offerSuppressionMs]) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) throw new Error("Invalid offer timeout/suppression.");
  }
  if (config.requiredStableWindows !== undefined && (!Number.isInteger(config.requiredStableWindows) || config.requiredStableWindows < 1)) throw new Error("Invalid stable persistence.");
  for (const key of ["samplingIntervalMs", "windowDurationMs", "minValidSamples", "requiredConsecutiveWindows"] as const) {
    if (!Number.isInteger(config[key]) || config[key] <= 0) throw new Error(`Invalid AUI parameter: ${key}`);
  }
  for (const key of ["adaptationCooldownMs", "recoveryDurationMs"] as const) {
    if (!Number.isFinite(config[key]) || config[key] < 0) throw new Error(`Invalid AUI parameter: ${key}`);
  }
  for (const key of ["confidenceThreshold", "negativeRatioThreshold", "stableRatioThreshold"] as const) {
    if (!Number.isFinite(config[key]) || config[key] < 0 || config[key] > 1) throw new Error(`Invalid AUI parameter: ${key}`);
  }
  if (!accumulation && config.negativeRatioThreshold + config.stableRatioThreshold <= 1) throw new Error("Dominance thresholds must not overlap.");
}

export const USER_APPROVED_CONFIG = Object.freeze({ interactionPolicy: "USER_APPROVED_V1" as const,
  offerTimeoutMs: 30000, offerSuppressionMs: 30000 });

// Confidence comparison: every other parameter is shared across the three pilots.
const PILOT_WINDOW_CONFIG: Readonly<AggregationConfig> = Object.freeze({
  ...INITIAL_AGGREGATION_CONFIG,
  samplingIntervalMs: 1000,
  windowDurationMs: 5000,
  minValidSamples: 4,
  requiredConsecutiveWindows: 2,
  requiredStableWindows: 2,
  offerTimeoutMs: USER_APPROVED_CONFIG.offerTimeoutMs,
  offerSuppressionMs: USER_APPROVED_CONFIG.offerSuppressionMs,
});

// Candidates for pilot calibration, not validated scientific cutoffs.
export const AUI_PROFILES = {
  BASELINE: INITIAL_AGGREGATION_CONFIG,
  PILOT_A: Object.freeze({ ...PILOT_WINDOW_CONFIG, confidenceThreshold: 0.6 }),
  PILOT_B: Object.freeze({ ...PILOT_WINDOW_CONFIG, confidenceThreshold: 0.5 }),
  PILOT_C: Object.freeze({ ...PILOT_WINDOW_CONFIG, confidenceThreshold: 0.4 }),
  PILOT_D: Object.freeze({ ...PILOT_WINDOW_CONFIG, windowDurationMs: 10000, minValidSamples: 7,
    confidenceThreshold: 0.4, minNegativeSamples: 3, negativeRatioThreshold: 0.3,
    requiredConsecutiveWindows: 1, negativeWindowPolicy: "OCCURRENCE_ACCUMULATION" as const }),
} satisfies Record<string, Readonly<AggregationConfig>>;
export type AUIProfileId = keyof typeof AUI_PROFILES;
// Temporary default for NEW test/pilot sessions; MAIN still requires explicit approval.
export const DEFAULT_PILOT_PROFILE: AUIProfileId = "PILOT_D";

export function getAdaptiveUIConfig(mode: AdaptiveUIMode): AdaptiveUIConfig {
  return { mode, sidebarCollapsed: mode !== "DEFAULT", showSecondaryWidgets: mode === "DEFAULT",
    showContextualHelp: mode === "ASSISTED", emphasizeLearningContent: mode !== "DEFAULT" };
}

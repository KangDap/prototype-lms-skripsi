import type { FERPrediction } from "../fer/types";

export type AffectiveState = "STABLE" | "NEGATIVE_AFFECT" | "AMBIGUOUS" | "UNKNOWN";
export type AdaptiveUIMode = "DEFAULT" | "FOCUS" | "ASSISTED";
export type ExperimentCondition = "ADAPTIVE" | "NON_ADAPTIVE";
export type InputSource = "REAL" | "SIMULATION";
export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";
export type AggregationConfig = {
  samplingIntervalMs: number;
  windowDurationMs: number;
  confidenceThreshold: number;
  minValidSamples: number;
  minNegativeSamples?: number;
  negativeWindowPolicy?: "OCCURRENCE_ACCUMULATION";
  negativeRatioThreshold: number;
  stableRatioThreshold: number;
  requiredConsecutiveWindows: number;
  /** Separate recovery persistence; legacy profiles fall back to the original field. */
  requiredStableWindows?: number;
  adaptationCooldownMs: number;
  recoveryDurationMs: number;
  interactionPolicy?: "USER_APPROVED_V1";
  offerTimeoutMs?: number;
  offerSuppressionMs?: number;
};
export type AffectiveWindow = {
  startedAt: number;
  endedAt: number;
  totalSamples: number;
  validSamples: number;
  negativeSamples: number;
  stableSamples: number;
  ambiguousSamples: number;
  negativeRatio: number;
  stableRatio: number;
  state: AffectiveState;
  /** PILOT_D diagnostics; legacy state values remain compatible with the engine. */
  status?: "NEGATIVE" | "STABLE" | "OTHER" | "INVALID";
  reason?: string;
  negativeQualified?: boolean;
  stableQualified?: boolean;
  startedAtIso?: string;
  endedAtIso?: string;
};
export type TriggerEligibility = {
  eligible: boolean;
  reason: string;
  blockers: { code: string; message: string }[];
  condition: ExperimentCondition;
  enabled: boolean;
  mode: AdaptiveUIMode;
  offerOpen: boolean;
  cooldownRemainingMs: number;
};
export type AdaptiveUIConfig = {
  mode: AdaptiveUIMode;
  sidebarCollapsed: boolean;
  showSecondaryWidgets: boolean;
  showContextualHelp: boolean;
  emphasizeLearningContent: boolean;
};
export type RuleState = {
  mode: AdaptiveUIMode;
  phase: "ACTIVE" | "RECOVERY";
  enabled: boolean;
  negativeWindows: number;
  stableWindows: number;
  lastWindowEnd: number | null;
  cooldownUntil: number;
  recoveryUntil: number | null;
  assistanceOffered: boolean;
  offerOpenedAt?: number | null;
  offerExpiresAt?: number | null;
  lastRule: RuleId;
  lastReason: string;
  lastAdaptationReason: string | null;
};
export type EventType =
  | "FER_PREDICTION" | "FER_STATUS_CHANGED" | "AFFECTIVE_WINDOW_EVALUATED"
  | "ADAPTATION_TRIGGERED" | "UI_MODE_CHANGED" | "RECOVERY_STARTED"
  | "ASSISTANCE_OFFERED" | "ASSISTANCE_ACCEPTED" | "ASSISTANCE_DISMISSED"
  | "MANUAL_OVERRIDE" | "SESSION_STARTED" | "SESSION_ENDED"
  | "FER_TRIGGER" | "ADAPTATION_OFFERED" | "ADAPTATION_OFFER_SHOWN" | "ADAPTATION_CHOICE" | "ADAPTATION_OFFER_CLOSED" | "ADAPTATION_OFFER_IGNORED" | "STABLE_PATTERN_RECOVERED" | "AUI_TRIGGER_ELIGIBILITY";
export type DecisionEvent = {
  type: EventType;
  ruleId: RuleId;
  reason: string;
  previousMode?: AdaptiveUIMode;
  choice?: AdaptiveUIMode | "TIDAK";
  offerOpenedAtMs?: number;
};
export type PredictionInput = {
  source: InputSource;
  streamId: string;
  sequence: number;
  capturedAt: number;
  prediction: FERPrediction | null;
};

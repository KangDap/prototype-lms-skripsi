import type { FERPrediction } from "../fer/types";
import { INITIAL_AGGREGATION_CONFIG, validateConfig } from "./config";
import { advanceApprovedTimers, describeOccurrenceEligibility } from "./user-approved-engine";
import { EmotionAggregator } from "./emotion-aggregator";
import { EventLog, type LogExport, type ResearchEvent } from "./event-log";
import { applyManualAction, clearPersistence, completeRecovery, evaluateWindow, initialRuleState, type ManualAction } from "./rule-engine";
import type { AffectiveWindow, AggregationConfig, DecisionEvent, ExperimentCondition, InputSource, PredictionInput, RuleState, TriggerEligibility } from "./types";

export type AdaptiveSnapshot = {
  sessionId: string | null;
  sessionOpen: boolean;
  source: InputSource;
  inputActive: boolean;
  now: number;
  engine: RuleState;
  preview: AffectiveWindow | null;
  lastWindow: AffectiveWindow | null;
  lastEligibility: TriggerEligibility | null;
  rawPrediction: FERPrediction | null;
  eventCount: number;
  droppedEvents: number;
};

export class AdaptiveSession {
  readonly config: Readonly<AggregationConfig>;
  readonly condition: ExperimentCondition;
  private snapshot: AdaptiveSnapshot = { sessionId: null, sessionOpen: false, source: "REAL", inputActive: false,
    now: 0, engine: initialRuleState(), preview: null, lastWindow: null, lastEligibility: null, rawPrediction: null, eventCount: 0, droppedEvents: 0 };
  private initialSnapshot = this.snapshot;
  private listeners = new Set<() => void>();
  private aggregator: EmotionAggregator;
  private log: EventLog | null = null;
  private archives: LogExport[] = [];
  private generation = 0;
  private streamId: string | null = null;
  private lastSequence = 0;
  private inputStartedAt = 0;
  private lastCapturedAt = -Infinity;
  private wallOffset = 0;
  private lastPresentedOffer: number | null = null;

  constructor(private context: { courseId: string; materialId: string; condition: ExperimentCondition },
    config: Readonly<AggregationConfig> = INITIAL_AGGREGATION_CONFIG,
    private createId: () => string = () => crypto.randomUUID()) {
    validateConfig(config);
    this.config = Object.freeze({ ...config });
    this.condition = context.condition;
    this.aggregator = new EmotionAggregator(this.config);
  }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.initialSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(now: number) {
    const log = this.log?.getStats();
    this.snapshot = { ...this.snapshot, now, preview: this.aggregator.preview(),
      eventCount: log?.retainedEvents ?? 0, droppedEvents: log?.droppedEvents ?? 0 };
    this.listeners.forEach((listener) => listener());
  }
  private record(now: number, data: Omit<ResearchEvent, "sequence" | "timestamp" | "elapsedMs" | "sessionId" | "condition" | "source" | "mode" | "affectiveState">) {
    this.log?.append(now, { ...data,
      ...(["FER_TRIGGER", "ADAPTATION_OFFERED"].includes(data.type) ? { window: this.snapshot.lastWindow ?? undefined,
        emotion: this.snapshot.rawPrediction?.emotion ?? null, confidence: this.snapshot.rawPrediction?.confidence ?? null } : {}),
      mode: this.snapshot.engine.mode, affectiveState: this.snapshot.lastWindow?.state ?? "UNKNOWN" });
  }
  private apply(result: { state: RuleState; events: DecisionEvent[] }, now: number) {
    this.snapshot = { ...this.snapshot, engine: result.state };
    result.events.forEach((event) => this.record(now, event));
  }
  open(now: number, wallNow = Date.now()) {
    if (this.snapshot.sessionOpen) return;
    if (this.log) this.archives.push(this.log.export());
    const source = this.snapshot.source;
    const sessionId = this.createId();
    this.lastPresentedOffer = null;
    this.wallOffset = wallNow - now;
    this.snapshot = { ...this.initialSnapshot, sessionId, sessionOpen: true, source, now };
    this.log = new EventLog({ ...this.context, source, sessionId, config: this.config }, now, wallNow);
    this.record(now, { type: "SESSION_STARTED", reason: "Sesi materi dimulai; izin kamera browser tetap diperlukan." });
    this.publish(now);
  }
  end(now: number, reason = "Sesi diakhiri.") {
    if (!this.snapshot.sessionOpen) return;
    this.stopInput(now, reason);
    this.record(now, { type: "SESSION_ENDED", reason });
    this.snapshot = { ...this.snapshot, sessionOpen: false };
    this.publish(now);
  }
  switchSource(source: InputSource, now: number) {
    if (source === this.snapshot.source || !this.snapshot.sessionOpen) return;
    this.end(now, "Sumber diubah; sesi berikutnya dipisahkan dari sesi ini.");
    this.snapshot = { ...this.snapshot, source };
    this.open(now, this.wallOffset + now);
  }
  startInput(now: number): number {
    if (!this.snapshot.sessionOpen) return -1;
    this.stopInput(now, "Memulai stream baru.");
    this.inputStartedAt = now;
    this.lastSequence = 0;
    this.lastCapturedAt = -Infinity;
    this.streamId = null;
    this.aggregator.start(now);
    this.snapshot = { ...this.snapshot, inputActive: true, engine: clearPersistence(this.snapshot.engine), lastWindow: null, lastEligibility: null };
    this.record(now, { type: "FER_STATUS_CHANGED", reason: "Stream prediksi aktif." });
    this.publish(now);
    return this.generation;
  }
  stopInput(now: number, reason = "FER dihentikan atau tidak tersedia; mode terakhir dipertahankan.", predictionStatus?: string) {
    if (this.config.interactionPolicy === "USER_APPROVED_V1" && this.snapshot.engine.assistanceOffered)
      this.apply(applyManualAction(this.snapshot.engine, "IGNORE_ADAPTATION", now, this.config, this.condition), now);
    this.generation++;
    this.aggregator.stop();
    if (this.snapshot.inputActive || predictionStatus === "error") this.record(now, { type: "FER_STATUS_CHANGED", reason, ...(predictionStatus ? { predictionStatus } : {}) });
    this.snapshot = { ...this.snapshot, inputActive: false, rawPrediction: null, lastWindow: null, lastEligibility: null,
      engine: { ...clearPersistence(this.snapshot.engine), lastRule: "R6", lastReason: reason } };
    this.publish(now);
  }
  ingest(input: PredictionInput, token: number, now: number): boolean {
    if (!this.snapshot.sessionOpen || !this.snapshot.inputActive || token !== this.generation ||
        input.source !== this.snapshot.source || (this.streamId !== null && input.streamId !== this.streamId) ||
        !Number.isInteger(input.sequence) || input.sequence <= this.lastSequence ||
        !Number.isFinite(input.capturedAt) || input.capturedAt < this.inputStartedAt || input.capturedAt > now ||
        input.capturedAt <= this.lastCapturedAt) return false;
    this.advance(now);
    this.streamId = input.streamId;
    this.lastSequence = input.sequence;
    this.lastCapturedAt = input.capturedAt;
    const usedForAggregation = this.aggregator.add(input.prediction, input.capturedAt);
    this.snapshot = { ...this.snapshot, rawPrediction: input.prediction };
    this.record(now, { type: "FER_PREDICTION", emotion: input.prediction?.emotion ?? null,
      confidence: input.prediction?.confidence ?? null, predictionStatus: input.prediction?.status ?? "error",
      streamId: input.streamId, sampleSequence: input.sequence, capturedAtMs: input.capturedAt, usedForAggregation });
    this.publish(now);
    return usedForAggregation;
  }
  private advance(now: number) {
    if (!this.snapshot.inputActive) return;
    for (const aggregated of this.aggregator.advance(now)) {
      const window = this.config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION"
        ? { ...aggregated, startedAtIso: new Date(this.wallOffset + aggregated.startedAt).toISOString(), endedAtIso: new Date(this.wallOffset + aggregated.endedAt).toISOString() }
        : aggregated;
      this.snapshot = { ...this.snapshot, lastWindow: window };
      this.record(now, { type: "AFFECTIVE_WINDOW_EVALUATED", window });
      const result = evaluateWindow(this.snapshot.engine, window, now, this.config, this.condition);
      if (this.config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION") {
        const eligibility = describeOccurrenceEligibility(this.snapshot.engine, window, now, this.config, this.condition,
          result.events.some((event) => event.type === "ADAPTATION_OFFERED"));
        this.snapshot = { ...this.snapshot, lastEligibility: eligibility };
        this.record(now, { type: "AUI_TRIGGER_ELIGIBILITY", window, eligibility, reason: eligibility.reason });
      }
      this.apply(result, now);
    }
    this.apply(this.config.interactionPolicy === "USER_APPROVED_V1"
      ? advanceApprovedTimers(this.snapshot.engine, now, this.config) : completeRecovery(this.snapshot.engine, now), now);
  }
  tick(now: number) {
    if (!this.snapshot.sessionOpen) return;
    this.advance(now);
    this.publish(now);
  }
  manual(action: ManualAction, now: number) {
    if (!this.snapshot.sessionOpen) return;
    this.apply(applyManualAction(this.snapshot.engine, action, now, this.config, this.condition), now);
    // Discard the partial window: pre-override samples must not trigger a new decision.
    if (this.snapshot.inputActive) this.aggregator.start(now);
    this.snapshot = { ...this.snapshot, lastWindow: null, lastEligibility: null };
    this.publish(now);
  }
  exportLogs() { return [...this.archives, ...(this.log ? [this.log.export()] : [])]; }
  getInputToken() { return this.generation; }
  markOfferPresented(now: number) {
    const state = this.snapshot.engine;
    if (!this.snapshot.sessionOpen || !state.assistanceOffered || state.offerOpenedAt == null || this.lastPresentedOffer === state.offerOpenedAt) return;
    this.lastPresentedOffer = state.offerOpenedAt;
    this.record(now, { type: "ADAPTATION_OFFER_SHOWN", ruleId: "R2", reason: "Dialog tawaran telah dirender.", offerOpenedAtMs: state.offerOpenedAt });
    this.publish(now);
  }
}

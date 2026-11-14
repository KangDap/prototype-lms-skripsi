import type { AdaptiveUIMode, AffectiveState, AffectiveWindow, AggregationConfig, EventType, ExperimentCondition, InputSource, RuleId, TriggerEligibility } from "./types";

export type ResearchEvent = {
  sequence: number;
  timestamp: string;
  elapsedMs: number;
  sessionId: string;
  condition: ExperimentCondition;
  source: InputSource;
  type: EventType;
  mode: AdaptiveUIMode;
  affectiveState: AffectiveState;
  previousMode?: AdaptiveUIMode;
  ruleId?: RuleId;
  reason?: string;
  window?: AffectiveWindow;
  emotion?: string | null;
  confidence?: number | null;
  predictionStatus?: string;
  streamId?: string;
  sampleSequence?: number;
  capturedAtMs?: number;
  usedForAggregation?: boolean;
  choice?: AdaptiveUIMode | "TIDAK";
  offerOpenedAtMs?: number;
  eligibility?: TriggerEligibility;
};

export type LogExport = {
  schemaVersion: 1;
  sessionId: string;
  courseId: string;
  materialId: string;
  condition: ExperimentCondition;
  source: InputSource;
  config: Readonly<AggregationConfig>;
  startedAt: string;
  monotonicOriginMs: number;
  endedAt: string | null;
  complete: boolean;
  retainedEvents: number;
  droppedEvents: number;
  events: ResearchEvent[];
};

// Bounded RAM only. Reserve one slot for SESSION_ENDED; never silently overwrite data.
export class EventLog {
  private events: ResearchEvent[] = [];
  private sequence = 0;
  private dropped = 0;
  private endedAt: string | null = null;
  constructor(private metadata: Omit<LogExport, "schemaVersion" | "startedAt" | "monotonicOriginMs" | "endedAt" | "complete" | "retainedEvents" | "droppedEvents" | "events">,
    private origin: number, private wallOrigin: number, private capacity = 10000) {
    if (!Number.isInteger(capacity) || capacity < 2) throw new Error("Log capacity must be at least two.");
  }
  append(now: number, data: Omit<ResearchEvent, "sequence" | "timestamp" | "elapsedMs" | "sessionId" | "condition" | "source">) {
    if (this.endedAt !== null) return;
    const sequence = ++this.sequence;
    const timestamp = new Date(this.wallOrigin + now - this.origin).toISOString();
    if (data.type === "SESSION_ENDED") this.endedAt = timestamp;
    else if (this.events.length >= this.capacity - 1) { this.dropped++; return; }
    this.events.push({ ...data, sequence, timestamp, elapsedMs: now - this.origin,
      sessionId: this.metadata.sessionId, condition: this.metadata.condition, source: this.metadata.source });
  }
  getStats() { return { retainedEvents: this.events.length, droppedEvents: this.dropped }; }
  export(): LogExport {
    return { ...this.metadata, schemaVersion: 1, startedAt: new Date(this.wallOrigin).toISOString(), monotonicOriginMs: this.origin,
      endedAt: this.endedAt, complete: this.endedAt !== null, retainedEvents: this.events.length,
      droppedEvents: this.dropped, events: this.events.map((event) => ({ ...event })) };
  }
}

export function validateLogExport(log: LogExport): string[] {
  const errors: string[] = [];
  if (log.retainedEvents !== log.events.length) errors.push("Jumlah event tidak sesuai.");
  if (log.events[0]?.type !== "SESSION_STARTED") errors.push("SESSION_STARTED tidak tersedia.");
  if (log.complete && log.events.at(-1)?.type !== "SESSION_ENDED") errors.push("SESSION_ENDED tidak tersedia.");
  if (!log.complete) errors.push("Sesi masih berjalan; ekspor belum final.");
  if (log.droppedEvents) errors.push(`${log.droppedEvents} event tidak tercatat karena kapasitas penuh.`);
  let previousElapsed = -1;
  let previousSequence = 0;
  for (const event of log.events) {
    if (event.sessionId !== log.sessionId || event.source !== log.source || event.condition !== log.condition ||
        !Number.isFinite(Date.parse(event.timestamp)) || event.elapsedMs < previousElapsed || event.sequence <= previousSequence) {
      errors.push("Identitas, urutan, atau timestamp event tidak valid.");
      break;
    }
    previousElapsed = event.elapsedMs;
    previousSequence = event.sequence;
  }
  return errors;
}

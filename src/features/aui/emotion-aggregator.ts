import type { FERPrediction } from "../fer/types";
import { mapPrediction } from "./affective-mapper";
import { validateConfig } from "./config";
import type { AffectiveWindow, AggregationConfig } from "./types";

function emptyWindow(startedAt: number, duration: number): AffectiveWindow {
  return { startedAt, endedAt: startedAt + duration, totalSamples: 0, validSamples: 0,
    negativeSamples: 0, stableSamples: 0, ambiguousSamples: 0,
    negativeRatio: 0, stableRatio: 0, state: "UNKNOWN" };
}

/** Only explicit accumulation snapshots use this classification; other profiles keep dominance. */
function occurrenceWindow(window: AffectiveWindow, config: Readonly<AggregationConfig>): AffectiveWindow {
  const negativeRatio = window.validSamples ? window.negativeSamples / window.validSamples : 0;
  const stableRatio = window.validSamples ? window.stableSamples / window.validSamples : 0;
  const enoughValid = window.validSamples >= config.minValidSamples;
  const enoughNegative = window.negativeSamples >= config.minNegativeSamples!;
  const enoughRatio = negativeRatio >= config.negativeRatioThreshold;
  const negativeQualified = enoughValid && enoughNegative && enoughRatio;
  const stableQualified = enoughValid && stableRatio >= config.stableRatioThreshold;
  const status = !enoughValid ? "INVALID" : negativeQualified ? "NEGATIVE" : stableQualified ? "STABLE" : "OTHER";
  const reason = !enoughValid
    ? `Sampel valid ${window.validSamples} < minimum ${config.minValidSamples}; window INVALID.`
    : negativeQualified
      ? `Negatif ${window.negativeSamples} >= ${config.minNegativeSamples}, rasio ${(negativeRatio * 100).toFixed(2)}% >= ${(config.negativeRatioThreshold * 100).toFixed(2)}%; NEGATIVE${stableQualified ? " diprioritaskan walaupun ambang stable juga terpenuhi" : ""}.`
      : `Syarat negatif tidak terpenuhi: negatif ${window.negativeSamples}/${config.minNegativeSamples}, rasio ${(negativeRatio * 100).toFixed(2)}%/${(config.negativeRatioThreshold * 100).toFixed(2)}%. ${stableQualified ? "Rasio stable memenuhi ambang; STABLE." : "Rasio stable belum memenuhi ambang; OTHER."}`;
  return { ...window, negativeRatio, stableRatio, status, reason, negativeQualified, stableQualified,
    state: status === "INVALID" ? "UNKNOWN" : status === "NEGATIVE" ? "NEGATIVE_AFFECT" : status === "STABLE" ? "STABLE" : "AMBIGUOUS" };
}

// Capture-time buckets [start, end). The caller advances before adding a sample.
export class EmotionAggregator {
  private window: AffectiveWindow | null = null;
  constructor(private config: Readonly<AggregationConfig>) { validateConfig(config); }
  start(now: number) { this.window = emptyWindow(now, this.config.windowDurationMs); }
  stop() { this.window = null; }
  add(prediction: FERPrediction | null, capturedAt: number) {
    if (!this.window || !Number.isFinite(capturedAt) || capturedAt < this.window.startedAt || capturedAt >= this.window.endedAt) return false;
    this.window.totalSamples++;
    const signal = mapPrediction(prediction, this.config.confidenceThreshold);
    if (signal !== "UNKNOWN") this.window.validSamples++;
    if (signal === "NEGATIVE_AFFECT") this.window.negativeSamples++;
    if (signal === "STABLE") this.window.stableSamples++;
    if (signal === "AMBIGUOUS") this.window.ambiguousSamples++;
    return true;
  }
  preview(): AffectiveWindow | null {
    if (!this.window) return null;
    if (this.config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION") return occurrenceWindow(this.window, this.config);
    const result = { ...this.window };
    result.negativeRatio = result.validSamples ? result.negativeSamples / result.validSamples : 0;
    result.stableRatio = result.validSamples ? result.stableSamples / result.validSamples : 0;
    if (result.validSamples >= this.config.minValidSamples) {
      result.state = result.negativeRatio >= this.config.negativeRatioThreshold ? "NEGATIVE_AFFECT"
        : result.stableRatio >= this.config.stableRatioThreshold ? "STABLE" : "AMBIGUOUS";
    }
    return result;
  }
  advance(now: number): AffectiveWindow[] {
    const completed: AffectiveWindow[] = [];
    if (!this.window || now < this.window.endedAt) return completed;
    completed.push(this.preview()!);
    const nextStart = this.window.endedAt;
    // Summarize timer gaps with the last empty UNKNOWN window; never replay triggers.
    const skipped = Math.floor((now - nextStart) / this.config.windowDurationMs);
    if (skipped > 0) {
      const empty = emptyWindow(nextStart + (skipped - 1) * this.config.windowDurationMs, this.config.windowDurationMs);
      completed.push(this.config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION" ? occurrenceWindow(empty, this.config) : empty);
    }
    this.window = emptyWindow(nextStart + skipped * this.config.windowDurationMs, this.config.windowDurationMs);
    return completed;
  }
}

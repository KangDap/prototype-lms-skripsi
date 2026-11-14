/* eslint-disable @typescript-eslint/no-require-imports -- In-memory TypeScript loader, matching the existing FER tests. */
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
Module._extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const { INITIAL_AGGREGATION_CONFIG: config, getAdaptiveUIConfig, validateConfig } = require("../src/features/aui/config.ts");
const { mapPrediction } = require("../src/features/aui/affective-mapper.ts");
const { EmotionAggregator } = require("../src/features/aui/emotion-aggregator.ts");
const { initialRuleState, evaluateWindow, applyManualAction, completeRecovery } = require("../src/features/aui/rule-engine.ts");
const { AdaptiveSession } = require("../src/features/aui/adaptive-session.ts");
const { createSyntheticPrediction: prediction } = require("../src/features/aui/simulation.ts");
const { EventLog, validateLogExport } = require("../src/features/aui/event-log.ts");
const { getExperimentSettings } = require("../src/features/aui/experiment.ts");
const repeated = (label, count = 10) => Array(count).fill(label);
const { AUI_PROFILES, DEFAULT_PILOT_PROFILE } = require("../src/features/aui/config.ts");
const pilotC = AUI_PROFILES.PILOT_C;
const pilotD = AUI_PROFILES.PILOT_D;
function occurrenceWindow(values, start = 0) {
  const aggregator = new EmotionAggregator(pilotD);
  aggregator.start(start);
  values.forEach((value, index) => aggregator.add(typeof value === "string" ? prediction(value) : value, start + index * 1000));
  return aggregator.advance(start + 10000)[0];
}
test("PILOT_D accumulation uses independent counts, valid denominator and negative priority", () => {
  for (const [values, status] of [
    [["Anger", "Neutral", "Sadness", "Surprise", "Fear", "Happiness", "Neutral"], "NEGATIVE"],
    [[...repeated("Neutral", 7), "Anger", "Sadness", "Fear"], "NEGATIVE"],
    [[...repeated("Surprise", 5), "Anger", "Sadness"], "OTHER"],
    [[...repeated("Anger", 4), "Neutral", "Surprise"], "INVALID"],
    [["Anger", "Sadness", "Fear", ...repeated("Neutral", 6), "Surprise"], "NEGATIVE"],
  ]) assert.equal(occurrenceWindow(values).status, status);
  const low = occurrenceWindow([prediction("Anger", 0.39), ...repeated("Neutral", 6), "no_face", "error", "invalid_prediction"]);
  assert.equal(low.validSamples, 6);
  assert.equal(low.status, "INVALID");
  assert.equal(occurrenceWindow([prediction("Anger", 0.4), "Sadness", "Fear", ...repeated("Surprise", 4)]).status, "NEGATIVE");
});
test("PILOT_D closes once at 10s, never reuses a boundary sample, and offers before choosing mode", () => {
  const aggregator = new EmotionAggregator(pilotD);
  aggregator.start(0);
  repeated("Anger", 7).forEach((label, index) => aggregator.add(prediction(label), index * 1000));
  assert.deepEqual(aggregator.advance(9999), []);
  const first = aggregator.advance(10000)[0];
  assert.equal(aggregator.add(prediction("Sadness"), 10000), true);
  assert.equal(aggregator.preview().totalSamples, 1);
  assert.equal(aggregator.add(prediction("Fear"), 9999), false);
  const config = { ...pilotD, interactionPolicy: "USER_APPROVED_V1" };
  const offered = evaluateWindow(initialRuleState(), first, 10000, config, "ADAPTIVE");
  assert.equal(offered.state.mode, "DEFAULT");
  assert.equal(offered.state.assistanceOffered, true);
  assert.equal(evaluateWindow(initialRuleState(), first, 10000, config, "NON_ADAPTIVE").state.assistanceOffered, false);
  assert.equal(applyManualAction(offered.state, "SELECT_ASSISTED", 10001, config, "ADAPTIVE").state.mode, "ASSISTED");
  const second = aggregator.advance(20000)[0];
  assert.equal(second.totalSamples, 1);
  assert.equal(second.status, "INVALID");
});
const { USER_APPROVED_CONFIG } = require("../src/features/aui/config.ts");
const { advanceApprovedTimers } = require("../src/features/aui/user-approved-engine.ts");
const approvedConfig = { ...pilotC, ...USER_APPROVED_CONFIG };
function approvedRule(state, start, values, condition = "ADAPTIVE") {
  return evaluateWindow(state, pilotWindow(start, values), start + 5000, approvedConfig, condition);
}
function approvedOffer() { return approvedRule(approvedRule(initialRuleState(), 0).state, 5000); }
test("user-approved mechanism offers at 10s without changing mode and permits either direct choice", () => {
  const result = approvedOffer();
  assert.equal(result.state.mode, "DEFAULT");
  assert.equal(result.state.assistanceOffered, true);
  assert.deepEqual(result.events.map((event) => event.type), ["FER_TRIGGER", "ADAPTATION_OFFERED"]);
  for (const [action, mode] of [["SELECT_FOCUS", "FOCUS"], ["SELECT_ASSISTED", "ASSISTED"]]) {
    const chosen = applyManualAction(result.state, action, 10100, approvedConfig, "ADAPTIVE");
    assert.equal(chosen.state.mode, mode);
    assert.equal(chosen.state.assistanceOffered, false);
    assert.equal(chosen.events[0].type, "ADAPTATION_CHOICE");
    assert.equal(chosen.events[0].choice, mode);
  }
});
test("offer decline/close/timeout preserve Default and suppress repeated dialogs", () => {
  for (const action of ["DECLINE_ADAPTATION", "CLOSE_ADAPTATION", "IGNORE_ADAPTATION"]) {
    let state = applyManualAction(approvedOffer().state, action, 10000, approvedConfig, "ADAPTIVE").state;
    for (let start = 10000; start < 35000; start += 5000) {
      state = approvedRule(state, start).state;
      assert.equal(state.assistanceOffered, false);
      assert.equal(state.mode, "DEFAULT");
    }
  }
  const timeout = advanceApprovedTimers(approvedOffer().state, 40000, approvedConfig);
  assert.equal(timeout.events[0].type, "ADAPTATION_OFFER_IGNORED");
  assert.equal(timeout.state.cooldownUntil, 70000);
});
test("explicit mode switches bypass trigger/cooldown; stable recovery retains user choice", () => {
  for (const mode of ["FOCUS", "ASSISTED"]) {
    let state = applyManualAction(initialRuleState(), mode === "FOCUS" ? "SELECT_FOCUS" : "SELECT_ASSISTED", 0, approvedConfig, "ADAPTIVE").state;
    for (let start = 0; start < 30000; start += 5000) state = approvedRule(state, start, repeated("Neutral", 5)).state;
    assert.equal(state.phase, "RECOVERY");
    state = advanceApprovedTimers(state, 31000, approvedConfig).state;
    assert.equal(state.mode, mode);
    assert.equal(state.phase, "ACTIVE");
    state = applyManualAction(state, mode === "FOCUS" ? "SELECT_ASSISTED" : "SELECT_FOCUS", 31001, approvedConfig, "ADAPTIVE").state;
    assert.equal(state.mode, mode === "FOCUS" ? "ASSISTED" : "FOCUS");
    assert.equal(applyManualAction(state, "RETURN_DEFAULT", 31002, approvedConfig, "ADAPTIVE").state.mode, "DEFAULT");
  }
});
test("Non-Adaptive logs windows but offers and mode selections are blocked", () => {
  let state = initialRuleState();
  for (let start = 0; start < 60000; start += 5000) state = approvedRule(state, start, undefined, "NON_ADAPTIVE").state;
  assert.equal(state.mode, "DEFAULT");
  assert.equal(state.assistanceOffered, false);
  assert.equal(applyManualAction(state, "SELECT_ASSISTED", 60000, approvedConfig, "NON_ADAPTIVE").state.mode, "DEFAULT");
});
function pilotWindow(start, values = repeated("Anger", 5)) {
  const aggregator = new EmotionAggregator(pilotC);
  aggregator.start(start);
  values.forEach((value, index) => aggregator.add(typeof value === "string" ? prediction(value) : value, start + index * 1000));
  return aggregator.advance(start + 5000)[0];
}
function pilotRule(state, start, values, condition = "ADAPTIVE") {
  return evaluateWindow(state, pilotWindow(start, values), start + 5000, pilotC, condition);
}
test("pilot profiles share all parameters except confidence and preserve Baseline", () => {
  assert.equal(DEFAULT_PILOT_PROFILE, "PILOT_D");
  assert.deepEqual(pilotC, { samplingIntervalMs: 1000, windowDurationMs: 5000, confidenceThreshold: 0.4,
    minValidSamples: 4, negativeRatioThreshold: 0.6, stableRatioThreshold: 0.6,
    requiredConsecutiveWindows: 2, requiredStableWindows: 2, adaptationCooldownMs: 30000, recoveryDurationMs: 1000,
    offerTimeoutMs: 30000, offerSuppressionMs: 30000 });
  for (const [id, confidence] of [["PILOT_A", 0.6], ["PILOT_B", 0.5], ["PILOT_C", 0.4]]) {
    assert.equal(AUI_PROFILES[id].confidenceThreshold, confidence);
    assert.deepEqual({ ...AUI_PROFILES[id], confidenceThreshold: 0 }, { ...pilotC, confidenceThreshold: 0 });
  }
  Object.values(AUI_PROFILES).forEach(validateConfig);
  assert.equal(AUI_PROFILES.BASELINE, config);
  assert.equal(AUI_PROFILES.BASELINE.windowDurationMs, 10000);
  assert.equal(AUI_PROFILES.BASELINE.minValidSamples, 8);
  assert.equal(AUI_PROFILES.BASELINE.confidenceThreshold, 0.6);
});
test("PILOT_C excludes confidence below 0.40, needs 4 valid and includes exact 60%", () => {
  const window = pilotWindow(0, [prediction("Anger", 0.4), "Sadness", "Fear", "Neutral", prediction("Fear", 0.39)]);
  assert.equal(window.totalSamples, 5);
  assert.equal(window.validSamples, 4);
  assert.equal(window.negativeSamples, 3);
  assert.equal(window.stableSamples, 1);
  assert.equal(window.negativeRatio, 3 / 4);
  assert.equal(window.state, "NEGATIVE_AFFECT");
  assert.equal(pilotWindow(0, ["Anger", "Sadness", "no_face", null, prediction("Fear", 0.39)]).state, "UNKNOWN");
  assert.equal(pilotWindow(0, ["Anger", "Sadness", "Neutral", "no_face", null]).state, "UNKNOWN");
  assert.equal(pilotWindow(0, ["Anger", "Anger", "Anger", "Neutral", "Surprise"]).negativeRatio, 0.6);
  assert.equal(pilotWindow(0, ["Anger", "Anger", "Anger", "Neutral", "Surprise"]).state, "NEGATIVE_AFFECT");
});

test("PILOT_C Focus starts at 10s; assistance waits for cooldown and consent", () => {
  let state = pilotRule(initialRuleState(), 0).state;
  assert.equal(state.mode, "DEFAULT");
  state = pilotRule(state, 5000).state;
  assert.equal(state.mode, "FOCUS");
  assert.equal(state.cooldownUntil, 40000);
  for (let start = 10000; start < 35000; start += 5000) {
    state = pilotRule(state, start).state;
    assert.equal(state.assistanceOffered, false);
  }
  const offered = pilotRule(state, 35000);
  assert.equal(offered.state.assistanceOffered, true);
  assert.equal(offered.state.mode, "FOCUS");
  assert.equal(offered.events[0].type, "ASSISTANCE_OFFERED");
  assert.equal(applyManualAction(offered.state, "ACCEPT_ASSISTANCE", 40000, pilotC, "ADAPTIVE").state.mode, "ASSISTED");
  assert.equal(applyManualAction(offered.state, "DISMISS_ASSISTANCE", 40000, pilotC, "ADAPTIVE").state.mode, "FOCUS");
});
test("PILOT_C recovery requires two stable windows, cooldown and 1s delay", () => {
  for (const mode of ["FOCUS", "ASSISTED"]) {
    let state = { ...pilotRule(pilotRule(initialRuleState(), 0).state, 5000).state, mode };
    for (let start = 10000; start < 30000; start += 5000) state = pilotRule(state, start).state;
    state = pilotRule(state, 30000, repeated("Neutral", 5)).state;
    assert.equal(state.phase, "ACTIVE");
    state = pilotRule(state, 35000, repeated("Neutral", 5)).state;
    assert.equal(state.phase, "RECOVERY");
    assert.equal(completeRecovery(state, 40999).state.mode, mode);
    assert.equal(completeRecovery(state, 41000).state.mode, "DEFAULT");
  }
});
test("PILOT_C unknown breaks persistence and Non-Adaptive never adapts", () => {
  let state = pilotRule(initialRuleState(), 0).state;
  state = pilotRule(state, 5000, repeated("no_face", 5)).state;
  assert.equal(pilotRule(state, 10000).state.mode, "DEFAULT");
  state = initialRuleState();
  for (let start = 0; start < 60000; start += 5000) state = pilotRule(state, start, undefined, "NON_ADAPTIVE").state;
  assert.equal(state.mode, "DEFAULT");
});
test("PILOT_C manual override suppresses triggers and session freezes config", () => {
  let state = pilotRule(pilotRule(initialRuleState(), 0).state, 5000).state;
  state = applyManualAction(state, "RETURN_DEFAULT", 10000, pilotC, "ADAPTIVE").state;
  for (let start = 10000; start < 35000; start += 5000) {
    state = pilotRule(state, start).state;
    assert.equal(state.mode, "DEFAULT");
  }
  assert.equal(pilotRule(state, 35000).state.mode, "FOCUS");
  const input = { ...pilotC };
  const session = new AdaptiveSession({ courseId: "test", materialId: "test", condition: "ADAPTIVE" }, input);
  input.windowDurationMs = 20000;
  assert.equal(session.config.windowDurationMs, 5000);
  assert.equal(Object.isFrozen(session.config), true);
});

test("PILOT_C runtime evaluates capture buckets at 5s and 10s and discards pre-override samples", () => {
  let id = 0;
  const session = new AdaptiveSession({ courseId: "test", materialId: "test", condition: "ADAPTIVE" }, pilotC, () => `pilot-c-${++id}`);
  session.open(0);
  const token = session.startInput(0);
  for (let start = 0; start < 10000; start += 5000) {
    for (let index = 0; index < 5; index++) {
      const now = start + index * 1000 + 100;
      assert.equal(session.ingest({ source: "REAL", streamId: "pilot", sequence: now, capturedAt: now, prediction: prediction("Anger") }, token, now), true);
    }
    session.tick(start + 5000);
    assert.equal(session.getSnapshot().engine.mode, start === 0 ? "DEFAULT" : "FOCUS");
  }
  const windows = session.exportLogs()[0].events.filter((event) => event.type === "AFFECTIVE_WINDOW_EVALUATED");
  assert.deepEqual(windows.map((event) => event.window.endedAt), [5000, 10000]);
  session.manual("RETURN_DEFAULT", 10100);
  assert.equal(session.getSnapshot().preview.startedAt, 10100);
  assert.equal(session.getSnapshot().preview.totalSamples, 0);
  assert.equal(session.getSnapshot().engine.cooldownUntil, 40100);
});

function aggregate(labels, start = 0, confidence = 0.82) {
  const aggregator = new EmotionAggregator(config);
  aggregator.start(start);
  labels.forEach((label, index) => aggregator.add(prediction(label, confidence), start + index * 1000));
  return aggregator.advance(start + 10000)[0];
}
function rule(state, label, start, now = start + 10000, condition = "ADAPTIVE") {
  return evaluateWindow(state, aggregate(repeated(label), start), now, config, condition);
}
function focus() { return rule(rule(initialRuleState(), "Anger", 0).state, "Sadness", 10000).state; }
function offered() {
  let state = focus();
  for (let start = 20000; start < 50000; start += 10000) state = rule(state, "Fear", start).state;
  return state;
}
function runtime(condition = "ADAPTIVE") {
  let id = 0;
  const session = new AdaptiveSession({ courseId: "course", materialId: "material", condition }, config, () => `test-${++id}`);
  session.open(0, Date.UTC(2026, 10, 5));
  const token = session.startInput(0);
  return { session, token };
}
function feedWindow(session, token, start, label = "Anger", source = "REAL", streamId = "stream") {
  for (let i = 0; i < 10; i++) {
    const now = start + i * 1000 + 100;
    session.ingest({ source, streamId, sequence: start + i + 1, capturedAt: now, prediction: prediction(label) }, token, now);
  }
  session.tick(start + 10000);
}

test("mapping preserves all eight labels and assigns only the specified affective signals", () => {
  for (const label of ["Happiness", "Neutral"]) assert.equal(mapPrediction(prediction(label), 0.6), "STABLE");
  for (const label of ["Anger", "Contempt", "Disgust", "Fear", "Sadness"]) assert.equal(mapPrediction(prediction(label), 0.6), "NEGATIVE_AFFECT");
  assert.equal(mapPrediction(prediction("Surprise"), 0.6), "AMBIGUOUS");
  for (const value of [null, prediction("no_face"), prediction("invalid_prediction"), prediction("Fear", 0.59),
    { ...prediction("Fear"), confidence: NaN }, { ...prediction("Fear"), emotion: "Confusion" }]) assert.equal(mapPrediction(value, 0.6), "UNKNOWN");
});
test("Neutral and Happiness dominant windows are STABLE", () => {
  assert.equal(aggregate([...repeated("Neutral", 3), ...repeated("Happiness", 3), ...repeated("Anger", 4)]).state, "STABLE");
});
test("negative threshold includes exactly 60 percent of valid samples", () => {
  const window = aggregate([...repeated("Anger", 6), ...repeated("Neutral", 4)]);
  assert.equal(window.negativeRatio, 0.6);
  assert.equal(window.state, "NEGATIVE_AFFECT");
});
test("Surprise remains valid in denominator and never counts as negative or stable", () => {
  const window = aggregate([...repeated("Surprise", 7), ...repeated("Anger", 3)]);
  assert.equal(window.validSamples, 10);
  assert.equal(window.negativeRatio, 0.3);
  assert.equal(window.stableRatio, 0);
  assert.equal(window.state, "AMBIGUOUS");
});
test("low confidence is excluded from valid denominator; threshold 0.6 is inclusive", () => {
  const aggregator = new EmotionAggregator(config);
  aggregator.start(0);
  for (let i = 0; i < 10; i++) aggregator.add(prediction(i < 8 ? "Sadness" : "Neutral", i < 8 ? 0.6 : 0.59), i * 1000);
  const window = aggregator.advance(10000)[0];
  assert.equal(window.validSamples, 8);
  assert.equal(window.totalSamples, 10);
  assert.equal(window.negativeRatio, 1);
});
test("no_face, invalid prediction and errors are UNKNOWN rather than Neutral", () => {
  for (const label of ["no_face", "invalid_prediction", "error"]) {
    const window = aggregate(repeated(label));
    assert.equal(window.validSamples, 0);
    assert.equal(window.stableSamples, 0);
    assert.equal(window.state, "UNKNOWN");
  }
});
test("too few samples and slower sampling cannot force a valid window", () => {
  const window = aggregate(repeated("Fear", 7));
  assert.equal(window.state, "UNKNOWN");
  assert.equal(window.negativeRatio, 1);
});
test("non-overlapping windows use capture-time boundaries; late captures cannot enter next window", () => {
  const aggregator = new EmotionAggregator(config);
  aggregator.start(250);
  assert.equal(aggregator.add(prediction("Anger"), 249), false);
  assert.equal(aggregator.add(prediction("Anger"), 10250), false);
  assert.equal(aggregator.advance(10249).length, 0);
  assert.equal(aggregator.advance(10250)[0].state, "UNKNOWN");
  assert.equal(aggregator.add(prediction("Anger"), 10249), false);
  assert.equal(aggregator.add(prediction("Anger"), 10250), true);
  assert.equal(aggregator.preview().startedAt, 10250);
});
test("a single negative window does not activate Focus", () => {
  const result = rule(initialRuleState(), "Anger", 0);
  assert.equal(result.state.mode, "DEFAULT");
  assert.equal(result.state.negativeWindows, 1);
  assert.equal(result.events.length, 0);
});
test("two consecutive negative windows activate Focus with R2 and log transition", () => {
  const result = rule(rule(initialRuleState(), "Anger", 0).state, "Sadness", 10000);
  assert.equal(result.state.mode, "FOCUS");
  assert.equal(result.state.cooldownUntil, 50000);
  assert.deepEqual(result.events.map((event) => event.type), ["ADAPTATION_TRIGGERED", "UI_MODE_CHANGED"]);
  assert.equal(result.events[0].ruleId, "R2");
});
test("UNKNOWN and AMBIGUOUS break consecutive persistence", () => {
  for (const label of ["no_face", "Surprise"]) {
    let state = rule(initialRuleState(), "Anger", 0).state;
    state = rule(state, label, 10000).state;
    state = rule(state, "Anger", 20000).state;
    assert.equal(state.mode, "DEFAULT");
    assert.equal(state.negativeWindows, 1);
  }
});
test("gapped and duplicate window evaluations never accumulate persistence", () => {
  const first = rule(initialRuleState(), "Anger", 0);
  assert.equal(rule(first.state, "Anger", 0).state.negativeWindows, 1);
  assert.equal(rule(first.state, "Anger", 20000).state.mode, "DEFAULT");
  const state = focus();
  assert.equal(rule(state, "Anger", 10000).state.negativeWindows, 0);
});
test("persistent negative affect in Focus offers assistance only after cooldown", () => {
  let state = focus();
  state = rule(state, "Anger", 20000).state;
  state = rule(state, "Anger", 30000).state;
  assert.equal(state.assistanceOffered, false);
  const result = rule(state, "Anger", 40000);
  assert.equal(result.state.mode, "FOCUS");
  assert.equal(result.state.assistanceOffered, true);
  assert.equal(result.events[0].type, "ASSISTANCE_OFFERED");
});
test("acceptance activates Assisted; dismissal keeps Focus and suppresses repeated offers", () => {
  const state = offered();
  const accepted = applyManualAction(state, "ACCEPT_ASSISTANCE", 51000, config, "ADAPTIVE");
  assert.equal(accepted.state.mode, "ASSISTED");
  assert.equal(accepted.events[0].type, "ASSISTANCE_ACCEPTED");
  let dismissed = applyManualAction(state, "DISMISS_ASSISTANCE", 51000, config, "ADAPTIVE").state;
  assert.equal(dismissed.mode, "FOCUS");
  assert.equal(dismissed.assistanceOffered, false);
  dismissed = rule(rule(dismissed, "Anger", 51000).state, "Anger", 61000).state;
  assert.equal(dismissed.assistanceOffered, false);
  assert.equal(applyManualAction(initialRuleState(), "ACCEPT_ASSISTANCE", 0, config, "ADAPTIVE").state.mode, "DEFAULT");
});
test("stable persistence initiates Recovery after cooldown and finishes without new FER predictions", () => {
  for (const mode of ["FOCUS", "ASSISTED"]) {
    let state = { ...focus(), mode };
    for (let start = 20000; start < 50000; start += 10000) state = rule(state, "Neutral", start).state;
    assert.equal(state.phase, "RECOVERY");
    assert.equal(state.mode, mode);
    assert.equal(completeRecovery(state, 50999).state.mode, mode);
    assert.equal(completeRecovery(state, 51000).state.mode, "DEFAULT");
  }
});
test("unknown during Recovery cancels pending recovery and preserves the safe mode", () => {
  const state = { ...focus(), phase: "RECOVERY", recoveryUntil: 30000 };
  const result = rule(state, "no_face", 20000).state;
  assert.equal(completeRecovery(result, 60000).state.mode, "FOCUS");
});
test("manual override returns Default and cannot be immediately cancelled by automatic rules", () => {
  let state = applyManualAction(focus(), "RETURN_DEFAULT", 20000, config, "ADAPTIVE").state;
  state = rule(rule(state, "Anger", 20000).state, "Anger", 30000).state;
  assert.equal(state.mode, "DEFAULT");
  assert.equal(state.lastRule, "R8");
  assert.equal(rule(state, "Anger", 40000).state.mode, "FOCUS");
});
test("disabled adaptation always stays Default, and reenabling starts with suppression", () => {
  let state = applyManualAction(focus(), "DISABLE", 20000, config, "ADAPTIVE").state;
  for (let start = 20000; start < 100000; start += 10000) state = rule(state, "Anger", start).state;
  assert.equal(state.mode, "DEFAULT");
  assert.equal(state.enabled, false);
  const enabled = applyManualAction(state, "ENABLE", 100000, config, "ADAPTIVE").state;
  assert.equal(enabled.negativeWindows, 0);
  assert.equal(enabled.cooldownUntil, 130000);
});
test("stopping FER rejects further predictions and prevents stale timer triggers", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  session.stopInput(10000);
  assert.equal(session.ingest({ source: "REAL", streamId: "stream", sequence: 10001, capturedAt: 11000, prediction: prediction("Anger") }, token, 11000), false);
  session.tick(999999);
  assert.equal(session.getSnapshot().engine.mode, "DEFAULT");
  assert.equal(session.getSnapshot().preview, null);
  assert.equal(session.getSnapshot().engine.negativeWindows, 0);
});
test("restart requires new consecutive windows and rejects late data from old generation", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  session.stopInput(10000);
  const newToken = session.startInput(20000);
  assert.equal(session.ingest({ source: "REAL", streamId: "stream", sequence: 30, capturedAt: 21000, prediction: prediction("Anger") }, token, 21000), false);
  feedWindow(session, newToken, 20000, "Anger", "REAL", "new-stream");
  assert.equal(session.getSnapshot().engine.mode, "DEFAULT");
  feedWindow(session, newToken, 30000, "Anger", "REAL", "new-stream");
  assert.equal(session.getSnapshot().engine.mode, "FOCUS");
});
test("NON_ADAPTIVE remains Default while still aggregating/logging consented FER", () => {
  const { session, token } = runtime("NON_ADAPTIVE");
  for (let start = 0; start < 100000; start += 10000) feedWindow(session, token, start);
  assert.equal(session.getSnapshot().engine.mode, "DEFAULT");
  assert.equal(session.getSnapshot().lastWindow.state, "NEGATIVE_AFFECT");
  assert.equal(session.exportLogs()[0].events.some((event) => event.type === "UI_MODE_CHANGED"), false);
  assert.equal(session.exportLogs()[0].events.some((event) => event.type === "FER_PREDICTION"), true);
});
test("FER failure preserves Focus and stops aggregation, including any scheduled recovery", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  feedWindow(session, token, 10000);
  session.stopInput(21000, "Service gagal.");
  session.tick(200000);
  assert.equal(session.getSnapshot().engine.mode, "FOCUS");
  assert.equal(session.getSnapshot().rawPrediction, null);
  assert.equal(session.getSnapshot().engine.lastRule, "R6");
});
test("simulation never mixes predictions or event identity with real FER", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  session.switchSource("SIMULATION", 10000);
  const simToken = session.startInput(10000);
  assert.equal(session.ingest({ source: "REAL", streamId: "stream", sequence: 99, capturedAt: 11000, prediction: prediction("Anger") }, simToken, 11000), false);
  feedWindow(session, simToken, 10000, "Anger", "SIMULATION", "sim");
  assert.equal(session.getSnapshot().engine.mode, "DEFAULT");
  session.end(20000);
  const logs = session.exportLogs();
  assert.equal(logs.length, 2);
  assert.notEqual(logs[0].sessionId, logs[1].sessionId);
  assert.equal(logs[0].source, "REAL");
  assert.equal(logs[1].source, "SIMULATION");
  logs.forEach((log) => assert.deepEqual(validateLogExport(log), []));
});
test("elapsed timer gaps cannot replay old negative windows", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  for (let i = 0; i < 10; i++) session.ingest({ source: "REAL", streamId: "stream", sequence: 100 + i, capturedAt: 10100 + i * 1000, prediction: prediction("Anger") }, token, 10100 + i * 1000);
  session.tick(60000);
  assert.equal(session.getSnapshot().engine.mode, "DEFAULT");
  assert.equal(session.getSnapshot().lastWindow.state, "UNKNOWN");
  assert.equal(session.getSnapshot().engine.negativeWindows, 0);
});
test("late capture is logged as excluded and cannot enter the next window", () => {
  const { session, token } = runtime();
  session.tick(10000);
  assert.equal(session.ingest({ source: "REAL", streamId: "stream", sequence: 1, capturedAt: 9500, prediction: prediction("Anger") }, token, 10100), false);
  assert.equal(session.getSnapshot().preview.validSamples, 0);
  assert.equal(session.exportLogs()[0].events.at(-1).usedForAggregation, false);
});
test("manual override discards partial samples collected before the override", () => {
  const { session, token } = runtime();
  feedWindow(session, token, 0);
  session.manual("RETURN_DEFAULT", 11000);
  assert.equal(session.getSnapshot().preview.startedAt, 11000);
  assert.equal(session.getSnapshot().preview.totalSamples, 0);
  assert.equal(session.getSnapshot().engine.negativeWindows, 0);
});
test("ended research sessions reject new camera data and preserve finalized exports", () => {
  const { session, token } = runtime();
  session.end(1000);
  const before = session.exportLogs();
  session.tick(10000);
  session.manual("ENABLE", 11000);
  assert.equal(session.startInput(12000), -1);
  assert.equal(session.ingest({ source: "REAL", streamId: "stream", sequence: 1, capturedAt: 13000, prediction: prediction("Anger") }, token, 13000), false);
  assert.deepEqual(session.exportLogs(), before);
  assert.deepEqual(validateLogExport(before[0]), []);
  assert.equal(JSON.stringify(before).includes("image/jpeg"), false);
});
test("log overflow is explicit, retains SESSION_ENDED and fails research completeness validation", () => {
  const log = new EventLog({ sessionId: "log", courseId: "course", materialId: "material", condition: "ADAPTIVE", source: "REAL", config }, 0, Date.UTC(2026, 10, 5), 3);
  const base = { mode: "DEFAULT", affectiveState: "UNKNOWN" };
  log.append(0, { ...base, type: "SESSION_STARTED" });
  for (let i = 1; i < 5; i++) log.append(i, { ...base, type: "FER_PREDICTION" });
  log.append(5, { ...base, type: "SESSION_ENDED" });
  const exported = log.export();
  assert.equal(exported.retainedEvents, 3);
  assert.equal(exported.droppedEvents, 3);
  assert.equal(exported.events.at(-1).type, "SESSION_ENDED");
  assert.equal(validateLogExport(exported).length, 1);
});
test("UI configuration exposes explicit presentation flags without emotion checks", () => {
  assert.deepEqual(getAdaptiveUIConfig("DEFAULT"), { mode: "DEFAULT", sidebarCollapsed: false, showSecondaryWidgets: true, showContextualHelp: false, emphasizeLearningContent: false });
  assert.equal(getAdaptiveUIConfig("FOCUS").sidebarCollapsed, true);
  assert.equal(getAdaptiveUIConfig("FOCUS").showContextualHelp, false);
  assert.equal(getAdaptiveUIConfig("ASSISTED").showContextualHelp, true);
});
test("invalid configuration fails early instead of creating conflicting dominance rules", () => {
  for (const overrides of [{ minValidSamples: 0 }, { windowDurationMs: -1 }, { confidenceThreshold: NaN },
    { requiredConsecutiveWindows: 1.5 }, { negativeRatioThreshold: 0.4, stableRatioThreshold: 0.4 }]) assert.throws(() => validateConfig({ ...config, ...overrides }));
});
test("experiment condition is fixed server configuration; research and non-adaptive modes hide debug", () => {
  const saved = { condition: process.env.AUI_EXPERIMENT_CONDITION, research: process.env.AUI_RESEARCH_MODE, node: process.env.NODE_ENV };
  try {
    process.env.NODE_ENV = "development";
    process.env.AUI_EXPERIMENT_CONDITION = "NON_ADAPTIVE";
    assert.equal(getExperimentSettings().debugAllowed, false);
    process.env.AUI_EXPERIMENT_CONDITION = "ADAPTIVE";
    process.env.AUI_RESEARCH_MODE = "true";
    assert.equal(getExperimentSettings().debugAllowed, false);
    process.env.AUI_RESEARCH_MODE = "false";
    assert.equal(getExperimentSettings().debugAllowed, true);
    process.env.NODE_ENV = "production";
    assert.equal(getExperimentSettings().debugAllowed, false);
    process.env.AUI_EXPERIMENT_CONDITION = "typo";
    assert.throws(getExperimentSettings);
  } finally {
    for (const [key, value] of Object.entries({ AUI_EXPERIMENT_CONDITION: saved.condition, AUI_RESEARCH_MODE: saved.research, NODE_ENV: saved.node })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

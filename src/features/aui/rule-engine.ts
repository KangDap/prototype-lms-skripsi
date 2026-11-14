import type { AffectiveWindow, AggregationConfig, DecisionEvent, ExperimentCondition, RuleId, RuleState } from "./types";
import { evaluateApprovedWindow, approvedManualAction } from "./user-approved-engine";

export function initialRuleState(): RuleState {
  return { mode: "DEFAULT", phase: "ACTIVE", enabled: true, negativeWindows: 0, stableWindows: 0,
    lastWindowEnd: null, cooldownUntil: 0, recoveryUntil: null, assistanceOffered: false,
    lastRule: "R1", lastReason: "Belum ada kondisi yang memenuhi trigger.", lastAdaptationReason: null };
}
export function clearPersistence(state: RuleState): RuleState {
  return { ...state, negativeWindows: 0, stableWindows: 0, lastWindowEnd: null,
    phase: "ACTIVE", recoveryUntil: null, assistanceOffered: false };
}
function decision(state: RuleState, ruleId: RuleId, reason: string) {
  return { ...state, lastRule: ruleId, lastReason: reason };
}
export function evaluateWindow(previous: RuleState, window: AffectiveWindow, now: number,
  config: Readonly<AggregationConfig>, condition: ExperimentCondition): { state: RuleState; events: DecisionEvent[] } {
  if (config.interactionPolicy === "USER_APPROVED_V1") return evaluateApprovedWindow(previous, window, now, config, condition);
  if (previous.lastWindowEnd !== null && window.endedAt <= previous.lastWindowEnd) return { state: previous, events: [] };
  let state = previous.lastWindowEnd !== null && window.startedAt !== previous.lastWindowEnd ? clearPersistence(previous) : { ...previous };
  state.lastWindowEnd = window.endedAt;
  const events: DecisionEvent[] = [];
  if (!state.enabled || condition === "NON_ADAPTIVE") {
    return { state: { ...clearPersistence(state), mode: "DEFAULT", lastRule: "R1", lastReason: "Adaptasi otomatis dinonaktifkan." }, events };
  }
  if (window.endedAt > now || now - window.endedAt >= config.windowDurationMs || window.state === "UNKNOWN" || window.state === "AMBIGUOUS") {
    return { state: decision({ ...clearPersistence(state), lastWindowEnd: window.endedAt }, "R6", "Window tidak dominan, tidak cukup data, atau sudah kedaluwarsa; mode dipertahankan."), events };
  }
  state.negativeWindows = window.state === "NEGATIVE_AFFECT" ? state.negativeWindows + 1 : 0;
  state.stableWindows = window.state === "STABLE" ? state.stableWindows + 1 : 0;
  if (window.state === "STABLE") state.assistanceOffered = false;
  if (state.phase === "RECOVERY") return { state, events };
  if (now < state.cooldownUntil) return { state: decision(state, "R8", "Cooldown aktif; belum ada transisi baru."), events };
  if (state.mode === "DEFAULT" && state.negativeWindows >= config.requiredConsecutiveWindows) {
    const reason = "Negative affect persisten pada window valid berturut-turut; sistem mengaktifkan tampilan Fokus.";
    state = { ...clearPersistence(state), lastWindowEnd: window.endedAt, mode: "FOCUS", cooldownUntil: now + config.adaptationCooldownMs,
      lastRule: "R2", lastReason: reason, lastAdaptationReason: reason };
    events.push({ type: "ADAPTATION_TRIGGERED", ruleId: "R2", reason, previousMode: "DEFAULT" },
      { type: "UI_MODE_CHANGED", ruleId: "R2", reason, previousMode: "DEFAULT" });
  } else if (state.mode === "FOCUS" && state.negativeWindows >= config.requiredConsecutiveWindows && !state.assistanceOffered) {
    const reason = "Negative affect tetap persisten di Fokus; bantuan ditawarkan untuk dipilih pengguna.";
    state = { ...state, assistanceOffered: true, cooldownUntil: now + config.adaptationCooldownMs,
      negativeWindows: 0, lastRule: "R3", lastReason: reason, lastAdaptationReason: reason };
    events.push({ type: "ASSISTANCE_OFFERED", ruleId: "R3", reason });
  } else if (state.mode !== "DEFAULT" && state.stableWindows >= (config.requiredStableWindows ?? config.requiredConsecutiveWindows)) {
    const reason = "Stable affect persisten; tampilan dipulihkan secara bertahap.";
    state = { ...clearPersistence(state), lastWindowEnd: window.endedAt, phase: "RECOVERY", recoveryUntil: now + config.recoveryDurationMs,
      cooldownUntil: now + config.adaptationCooldownMs, lastRule: "R5", lastReason: reason, lastAdaptationReason: reason };
    events.push({ type: "ADAPTATION_TRIGGERED", ruleId: "R5", reason }, { type: "RECOVERY_STARTED", ruleId: "R5", reason });
  } else state = decision(state, "R1", "Persistence belum memenuhi aturan; mode dipertahankan.");
  return { state, events };
}
export function completeRecovery(state: RuleState, now: number): { state: RuleState; events: DecisionEvent[] } {
  if (state.phase !== "RECOVERY" || state.recoveryUntil === null || now < state.recoveryUntil) return { state, events: [] };
  const reason = "Recovery selesai; tampilan normal dipulihkan tanpa mengganti materi.";
  return { state: { ...clearPersistence(state), mode: "DEFAULT", lastRule: "R5", lastReason: reason, lastAdaptationReason: reason },
    events: [{ type: "UI_MODE_CHANGED", ruleId: "R5", reason, previousMode: state.mode }] };
}
export type ManualAction = "RETURN_DEFAULT" | "ENABLE" | "DISABLE" | "ACCEPT_ASSISTANCE" | "DISMISS_ASSISTANCE"
  | "SELECT_FOCUS" | "SELECT_ASSISTED" | "DECLINE_ADAPTATION" | "CLOSE_ADAPTATION" | "IGNORE_ADAPTATION";
export function applyManualAction(state: RuleState, action: ManualAction, now: number,
  config: Readonly<AggregationConfig>, condition: ExperimentCondition): { state: RuleState; events: DecisionEvent[] } {
  if (config.interactionPolicy === "USER_APPROVED_V1") return approvedManualAction(state, action, now, config, condition);
  if ((action === "ACCEPT_ASSISTANCE" || action === "DISMISS_ASSISTANCE") &&
      (condition !== "ADAPTIVE" || !state.enabled || state.mode !== "FOCUS" || !state.assistanceOffered)) return { state, events: [] };
  const next = { ...clearPersistence(state), cooldownUntil: now + config.adaptationCooldownMs };
  const reason = action === "ACCEPT_ASSISTANCE" ? "Pengguna menerima bantuan kontekstual."
    : action === "DISMISS_ASSISTANCE" ? "Pengguna menolak bantuan; penawaran berikutnya ditunda."
    : action === "ENABLE" ? "Pengguna mengaktifkan adaptasi; data baru diperlukan dan cooldown dimulai."
    : action === "DISABLE" ? "Pengguna menonaktifkan adaptasi dan memulihkan tampilan normal."
    : "Pengguna memulihkan tampilan normal; auto-trigger ditunda.";
  if (action === "ENABLE") next.enabled = true;
  if (action === "DISABLE") next.enabled = false;
  if (action === "ACCEPT_ASSISTANCE") next.mode = "ASSISTED";
  if (["RETURN_DEFAULT", "DISABLE"].includes(action) || condition === "NON_ADAPTIVE") next.mode = "DEFAULT";
  const ruleId = action === "ACCEPT_ASSISTANCE" ? "R4" : "R7";
  next.lastRule = ruleId;
  next.lastReason = reason;
  next.lastAdaptationReason = reason;
  const events: DecisionEvent[] = [{ type: action === "ACCEPT_ASSISTANCE" ? "ASSISTANCE_ACCEPTED"
    : action === "DISMISS_ASSISTANCE" ? "ASSISTANCE_DISMISSED" : "MANUAL_OVERRIDE", ruleId, reason, previousMode: state.mode }];
  if (state.mode !== next.mode) events.push({ type: "UI_MODE_CHANGED", ruleId, reason, previousMode: state.mode });
  return { state: next, events };
}

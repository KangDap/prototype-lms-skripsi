import type { AffectiveWindow, AggregationConfig, DecisionEvent, ExperimentCondition, RuleState, TriggerEligibility } from "./types";
import type { ManualAction } from "./rule-engine";

function clearOffer(state: RuleState): RuleState {
  return { ...state, assistanceOffered: false, offerOpenedAt: null, offerExpiresAt: null };
}
export function approvedManualAction(state: RuleState, action: ManualAction, now: number,
  config: Readonly<AggregationConfig>, condition: ExperimentCondition): { state: RuleState; events: DecisionEvent[] } {
  if (condition !== "ADAPTIVE") return { state: { ...clearOffer(state), mode: "DEFAULT" }, events: [] };
  const dismissal = ["DECLINE_ADAPTATION", "CLOSE_ADAPTATION", "IGNORE_ADAPTATION", "DISMISS_ASSISTANCE"].includes(action);
  if (dismissal && !state.assistanceOffered) return { state, events: [] };
  if (["SELECT_FOCUS", "SELECT_ASSISTED", "ACCEPT_ASSISTANCE"].includes(action) && !state.enabled) return { state, events: [] };
  const mode = action === "SELECT_FOCUS" ? "FOCUS" : ["SELECT_ASSISTED", "ACCEPT_ASSISTANCE"].includes(action) ? "ASSISTED"
    : ["RETURN_DEFAULT", "DISABLE"].includes(action) ? "DEFAULT" : state.mode;
  const reason = dismissal ? `Tawaran adaptasi: ${action}; tampilan dipertahankan.` : `Pilihan pengguna: ${action}.`;
  const event: DecisionEvent = { type: action === "IGNORE_ADAPTATION" ? "ADAPTATION_OFFER_IGNORED"
    : action === "CLOSE_ADAPTATION" ? "ADAPTATION_OFFER_CLOSED" : state.assistanceOffered && ["SELECT_FOCUS", "SELECT_ASSISTED", "ACCEPT_ASSISTANCE", "DECLINE_ADAPTATION", "DISMISS_ASSISTANCE"].includes(action) ? "ADAPTATION_CHOICE" : "MANUAL_OVERRIDE",
    ruleId: "R7", reason, previousMode: state.mode,
    ...(state.offerOpenedAt != null ? { offerOpenedAtMs: state.offerOpenedAt } : {}),
    ...(["DECLINE_ADAPTATION", "DISMISS_ASSISTANCE"].includes(action) ? { choice: "TIDAK" as const }
      : ["SELECT_FOCUS", "SELECT_ASSISTED", "ACCEPT_ASSISTANCE", "RETURN_DEFAULT"].includes(action) ? { choice: mode } : {}) };
  const events: DecisionEvent[] = [event];
  if (state.assistanceOffered && event.type === "MANUAL_OVERRIDE") events.push({ type: "ADAPTATION_OFFER_CLOSED", ruleId: "R7", reason: `Tawaran ditutup oleh ${action}.`, offerOpenedAtMs: state.offerOpenedAt ?? undefined });
  if (state.mode !== mode) events.push({ type: "UI_MODE_CHANGED", ruleId: "R7", reason, previousMode: state.mode, choice: mode });
  return { state: { ...clearOffer(state), mode, phase: "ACTIVE", recoveryUntil: null,
    negativeWindows: 0, stableWindows: 0, lastWindowEnd: null,
    enabled: action === "DISABLE" ? false : action === "ENABLE" ? true : state.enabled,
    cooldownUntil: now + (dismissal ? config.offerSuppressionMs ?? config.adaptationCooldownMs : config.adaptationCooldownMs),
    lastRule: "R7", lastReason: reason, lastAdaptationReason: reason }, events };
}

export function evaluateApprovedWindow(previous: RuleState, window: AffectiveWindow, now: number,
  config: Readonly<AggregationConfig>, condition: ExperimentCondition): { state: RuleState; events: DecisionEvent[] } {
  if (previous.lastWindowEnd !== null && window.endedAt <= previous.lastWindowEnd) return { state: previous, events: [] };
  let state = { ...previous, lastWindowEnd: window.endedAt };
  if (previous.lastWindowEnd !== null && window.startedAt !== previous.lastWindowEnd) state = { ...state, negativeWindows: 0, stableWindows: 0 };
  if (!state.enabled || condition === "NON_ADAPTIVE") return { state: { ...clearOffer(state), mode: "DEFAULT", negativeWindows: 0, stableWindows: 0 }, events: [] };
  if (window.endedAt > now || now - window.endedAt >= config.windowDurationMs || ["UNKNOWN", "AMBIGUOUS"].includes(window.state)) {
    return { state: { ...state, negativeWindows: 0, stableWindows: 0, phase: "ACTIVE", recoveryUntil: null,
      lastRule: "R6", lastReason: "Window tidak cukup valid atau tidak dominan; pilihan tampilan dipertahankan." }, events: [] };
  }
  state.negativeWindows = window.state === "NEGATIVE_AFFECT"
    ? config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION" ? 1 : state.negativeWindows + 1 : 0;
  state.stableWindows = window.state === "STABLE" ? state.stableWindows + 1 : 0;
  if (now < state.cooldownUntil) return { state: { ...state, lastRule: "R8", lastReason: "Cooldown tawaran aktif; pilihan pengguna dipertahankan." }, events: [] };
  if (state.stableWindows >= (config.requiredStableWindows ?? config.requiredConsecutiveWindows)) {
    // Recovery clears signal persistence, never an explicitly chosen reading mode.
    if (state.phase !== "RECOVERY") return { state: { ...state, phase: "RECOVERY", recoveryUntil: now + config.recoveryDurationMs,
      lastRule: "R5", lastReason: "Pola stable; pemulihan sinyal menunggu delay tanpa mengganti mode pengguna." },
      events: [{ type: "RECOVERY_STARTED", ruleId: "R5", reason: "Pemulihan sinyal; mode pilihan dipertahankan." }] };
  } else { state.phase = "ACTIVE"; state.recoveryUntil = null; }
  if (state.mode === "DEFAULT" && !state.assistanceOffered && state.negativeWindows >= config.requiredConsecutiveWindows) {
    const reason = config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION"
      ? `Akumulasi ${window.negativeSamples} prediksi negatif dari ${window.validSamples} valid (${(window.negativeRatio * 100).toFixed(2)}%) dalam satu window; meminta pilihan pengguna.`
      : `${config.requiredConsecutiveWindows} window negatif berturut-turut sesuai profil; meminta pilihan pengguna.`;
    return { state: { ...state, negativeWindows: 0, assistanceOffered: true, offerOpenedAt: now,
      offerExpiresAt: now + (config.offerTimeoutMs ?? 30000), lastRule: "R2", lastReason: reason, lastAdaptationReason: reason },
      events: [{ type: "FER_TRIGGER", ruleId: "R2", reason }, { type: "ADAPTATION_OFFERED", ruleId: "R2", reason, offerOpenedAtMs: now }] };
  }
  return { state, events: [] };
}

export function advanceApprovedTimers(state: RuleState, now: number, config: Readonly<AggregationConfig>) {
  if (state.assistanceOffered && state.offerExpiresAt != null && now >= state.offerExpiresAt)
    return approvedManualAction(state, "IGNORE_ADAPTATION", now, config, "ADAPTIVE");
  if (state.phase === "RECOVERY" && state.recoveryUntil != null && now >= state.recoveryUntil) {
    const reason = "Pola stable dipulihkan; mode pilihan pengguna tetap aktif.";
    return { state: { ...state, phase: "ACTIVE" as const, recoveryUntil: null, negativeWindows: 0, stableWindows: 0,
      cooldownUntil: now + config.adaptationCooldownMs, lastRule: "R5" as const, lastReason: reason },
      events: [{ type: "STABLE_PATTERN_RECOVERED" as const, ruleId: "R5" as const, reason }] };
  }
  return { state, events: [] };
}

/** Diagnostics only: the engine's actual offer decision is the source of truth. */
export function describeOccurrenceEligibility(previous: RuleState, window: AffectiveWindow, now: number,
  config: Readonly<AggregationConfig>, condition: ExperimentCondition, offered: boolean): TriggerEligibility {
  const blockers: TriggerEligibility["blockers"] = [];
  if (window.status === "INVALID") blockers.push({ code: "WINDOW_INVALID", message: window.reason ?? "Sampel valid kurang dari minimum." });
  else if (window.state !== "NEGATIVE_AFFECT") blockers.push({ code: "WINDOW_NOT_NEGATIVE", message: window.reason ?? "Window tidak memenuhi aturan negatif." });
  if (previous.lastWindowEnd !== null && window.endedAt <= previous.lastWindowEnd) blockers.push({ code: "DUPLICATE_WINDOW", message: "Window sudah dievaluasi." });
  if (window.endedAt > now || now - window.endedAt >= config.windowDurationMs) blockers.push({ code: "WINDOW_NOT_CURRENT", message: "Window belum selesai atau sudah kedaluwarsa." });
  if (condition !== "ADAPTIVE") blockers.push({ code: "NON_ADAPTIVE", message: "Kondisi NON_ADAPTIVE tidak menerima tawaran." });
  if (!previous.enabled) blockers.push({ code: "ADAPTATION_DISABLED", message: "Adaptasi dinonaktifkan pengguna." });
  if (previous.mode !== "DEFAULT") blockers.push({ code: "MODE_NOT_DEFAULT", message: `Mode ${previous.mode} pilihan pengguna masih aktif.` });
  if (previous.assistanceOffered) blockers.push({ code: "OFFER_ALREADY_OPEN", message: "Dialog tawaran sudah terbuka." });
  const cooldownRemainingMs = Math.max(0, previous.cooldownUntil - now);
  if (cooldownRemainingMs > 0) blockers.push({ code: "COOLDOWN_OR_SUPPRESSION", message: `Cooldown/suppression tersisa ${Math.ceil(cooldownRemainingMs / 1000)} detik.` });
  if (!offered && blockers.length === 0) blockers.push({ code: "ENGINE_RULE_BLOCKED", message: "Engine belum mengizinkan tawaran pada evaluasi ini." });
  return { eligible: offered,
    reason: offered ? "Window negatif memenuhi syarat dan seluruh eligibility tawaran terpenuhi." : blockers.map((item) => item.message).join(" "),
    blockers, condition, enabled: previous.enabled, mode: previous.mode, offerOpen: previous.assistanceOffered, cooldownRemainingMs };
}

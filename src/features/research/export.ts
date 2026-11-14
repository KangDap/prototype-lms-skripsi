import type { StudyRecord, StudyEvent } from "./types";
import { CLT_DIMENSIONS } from "./clt";
import { studyFlow } from "./routing";

function cell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csv(rows: unknown[][]) { return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"); }
function duration(start?: string, end?: string) { return start && end ? Date.parse(end) - Date.parse(start) : undefined; }
export function exportCSV(study: StudyRecord, format: string, events: StudyEvent[] = []) {
  const context = [study.id, study.participantId, study.stationId, study.kind, study.sequence, studyFlow(study), study.allocation?.version, study.allocation?.digest, study.questionnaire.status, study.questionnaire.itemIdScheme ?? "SEQUENTIAL_LEGACY", study.appVersion, study.materialVersion, study.assessmentVersion, study.methodologyVersion, study.config.interactionPolicy ?? "STAGED_LEGACY", study.cltPresentationVersion, study.protocolVersion, study.protocolAcknowledgedAt];
  const header = ["session_id", "participant_id", "station_id", "kind", "sequence", "flow_version", "allocation_version", "allocation_digest", "instrument_status", "item_id_scheme", "app_version", "material_snapshot_version", "assessment_snapshot_version", "methodology_version", "aui_mechanism", "clt_presentation_version", "protocol_version", "protocol_acknowledged_at"];
  function quality(blockId: string) {
    const real = events.filter((event) => event.blockId === blockId && event.payload.source === "REAL");
    const predictions = real.filter((event) => event.type === "FER_PREDICTION");
    const countStatus = (status: string) => predictions.filter((event) => event.payload.predictionStatus === status).length;
    const summaries = real.filter((event) => event.type === "MINUTE_SUMMARY");
    const droppedBySession = new Map<string, number>();
    for (const event of real.filter((item) => item.type === "LOG_INTEGRITY")) {
      const id = String(event.payload.adaptiveSessionId);
      droppedBySession.set(id, Math.max(droppedBySession.get(id) ?? 0, Number(event.payload.droppedEvents ?? 0)));
    }
    const modeTime = (mode: string) => summaries.reduce((sum, event) => sum + Number((event.payload.modeMs as Record<string, number> | undefined)?.[mode] ?? 0), 0);
    return [predictions.length, predictions.filter((event) => event.payload.predictionStatus === "ok" && Number(event.payload.confidence) >= study.config.confidenceThreshold).length,
      countStatus("no_face"), countStatus("invalid_prediction"), real.filter((event) => event.type === "FER_STATUS_CHANGED" && event.payload.predictionStatus === "error").length,
      real.filter((event) => event.type === "UI_MODE_CHANGED").length, real.filter((event) => ["ASSISTANCE_OFFERED", "ADAPTATION_OFFERED"].includes(event.type)).length,
      ...["DEFAULT", "FOCUS", "ASSISTED"].map(modeTime), summaries.reduce((sum, event) => sum + Number(event.payload.hiddenMs ?? 0), 0),
      [...droppedBySession.values()].reduce((sum, count) => sum + count, 0)];
  }
  if (format === "aui-events") return csv([[...header, "block_id", "order", "material_id", "condition", "episode_id", "timestamp", "source", "type", "mode", "previous_mode", "choice", "reason", "emotion", "confidence", "offer_opened_at_ms", "window_json", "window_status", "window_reason", "eligible", "eligibility_reason", "eligibility_blockers_json"],
    ...events.filter((event) => /^(FER_TRIGGER|ADAPTATION_|AUI_TRIGGER_ELIGIBILITY|UI_MODE_CHANGED|MANUAL_OVERRIDE|RECOVERY_STARTED|STABLE_PATTERN_RECOVERED|ASSISTANCE_)/.test(event.type)).map((event) => {
      const block = study.blocks.find((item) => item.id === event.blockId)!; const p = event.payload;
      const window = p.window as Record<string, unknown> | undefined;
      const eligibility = p.eligibility as Record<string, unknown> | undefined;
      return [...context, block.id, block.order, block.materialId, block.condition, event.episodeId, event.timestamp, p.source, event.type,
        p.mode, p.previousMode, p.choice, p.reason, p.emotion, p.confidence, p.offerOpenedAtMs, JSON.stringify(p.window ?? null),
        window?.status, window?.reason, eligibility?.eligible, eligibility?.reason, eligibility ? JSON.stringify(eligibility.blockers ?? []) : undefined];
    }),
  ]);
  if (format === "items") {
    return csv([[...header, "block_id", "order", "material_id", "condition", "instrument_version", "item_id", "source_label", "source_item", "dimension", "answer", "submitted_at", "clt_started_at", "clt_duration_ms", "response_source"],
      ...study.blocks.flatMap((block) => study.questionnaire.items.map((item) => [...context, block.id, block.order, block.materialId, block.condition,
        study.questionnaire.version, item.id, item.sourceLabel, item.sourceItem, item.dimension, block.clt?.answers[item.id], block.clt?.submittedAt, block.clt?.startedAt, block.clt?.durationMs, block.clt?.responseSource ?? (block.clt ? "UNSPECIFIED_LEGACY" : undefined)])),
    ]);
  }
  if (format === "blocks") return csv([[...header, "block_id", "order", "material_id", "condition", "profile", "material_version", "test_version", "instrument_version", "ICL", "ECL", "GCL", "pre_correct", "pre_total", "post_correct", "post_total", "learning_ms", "clt_skipped_test", "block_complete", "paired_complete", "interruptions", "fer_samples_real", "fer_valid", "no_face", "invalid", "service_errors", "ui_mode_changes", "assistance_offered", "visible_default_ms", "visible_focus_ms", "visible_assisted_ms", "hidden_ms", "dropped_events", "clt_started_at", "clt_submitted_at", "clt_duration_ms", "response_source"],
    ...study.blocks.map((block) => [...context, block.id, block.order, block.materialId, block.condition, study.profileId, study.materialVersion, study.assessmentVersion,
      study.questionnaire.version, ...CLT_DIMENSIONS.map((dimension) => block.clt?.scores[dimension]), block.pretest?.correct, block.pretest?.total,
      block.posttest?.correct, block.posttest?.total, duration(block.phaseTimes.LEARNING, studyFlow(study) === "POSTTEST_THEN_CLT" ? block.phaseTimes.POSTTEST : block.phaseTimes.CLT), Boolean(block.cltSkippedForTest),
      Boolean(block.completedAt && block.clt), study.blocks.every((item) => Boolean(item.completedAt && item.clt)), study.interruptions.filter((item) => item.blockId === block.id).length, ...quality(block.id), block.clt?.startedAt, block.clt?.submittedAt, block.clt?.durationMs, block.clt?.responseSource ?? (block.clt ? "UNSPECIFIED_LEGACY" : undefined)]),
  ]);
  if (format === "minutes") return csv([[...header, "block_id", "order", "material_id", "condition", "episode_id", "source", "timestamp", "duration_ms", "partial", "samples", "valid", "no_face", "invalid", "service_errors", "rate_hz", "mode_changes", "default_ms", "focus_ms", "assisted_ms", "hidden_ms", "emotions_json"],
    ...events.filter((event) => event.type === "MINUTE_SUMMARY").map((event) => {
      const block = study.blocks.find((item) => item.id === event.blockId)!; const p = event.payload; const mode = p.modeMs as Record<string, number>;
      return [...context, block.id, block.order, block.materialId, block.condition, event.episodeId, p.source, event.timestamp,
        p.durationMs, p.partial, p.samples, p.valid, p.noFace, p.invalid, p.errors, p.rateHz, p.modeChanges, mode.DEFAULT, mode.FOCUS, mode.ASSISTED, p.hiddenMs, JSON.stringify(p.emotions)];
    }),
  ]);
  if (format === "tests") return csv([[...header, "block_id", "order", "material_id", "condition", "test_phase", "test_version", "question_id", "answer_index", "correct_index", "correct", "submitted_at"],
    ...study.blocks.flatMap((block) => (["PRETEST", "POSTTEST"] as const).flatMap((phase) => {
      const definition = study.assessments.find((item) => item.materialId === block.materialId && item.phase === phase)!;
      const response = phase === "PRETEST" ? block.pretest : block.posttest;
      return definition.questions.map((item) => [...context, block.id, block.order, block.materialId, block.condition, phase, definition.version, item.id,
        response?.answers[item.id], definition.key[item.id], response ? response.answers[item.id] === definition.key[item.id] : undefined, response?.submittedAt]);
    })),
  ]);
  if (format === "paired") {
    const conditions = ["ADAPTIVE", "NON_ADAPTIVE"] as const;
    return csv([[...header, "paired_complete", "instrument_version", ...conditions.flatMap((condition) => ["material", "order", "ICL", "ECL", "GCL", "pre_correct", "post_correct", "clt_duration_ms", "response_source"].map((name) => `${condition}_${name}`))],
      [...context, study.blocks.every((block) => Boolean(block.completedAt && block.clt)), study.questionnaire.version,
        ...conditions.flatMap((condition) => { const block = study.blocks.find((item) => item.condition === condition)!;
          return [block.materialId, block.order, ...CLT_DIMENSIONS.map((dimension) => block.clt?.scores[dimension]), block.pretest?.correct, block.posttest?.correct, block.clt?.durationMs, block.clt?.responseSource ?? (block.clt ? "UNSPECIFIED_LEGACY" : undefined)]; })],
    ]);
  }
  throw new Error("Format ekspor tidak dikenal.");
}

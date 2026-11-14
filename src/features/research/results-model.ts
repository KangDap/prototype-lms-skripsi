import type { CLTDimension, CLTScores } from "./clt";
import type { ExperimentCondition } from "../aui/types";
import type { MaterialId, StudyKind, StudyPhase, StudyRecord, StudyEvent } from "./types";

export type ResultBlock = {
  id: string; order: number; condition: ExperimentCondition; materialId: MaterialId; materialTitle: string;
  completedAt?: string; scores: CLTScores | null; cltSubmittedAt?: string; cltDurationMs?: number;
  responseSource: "PARTICIPANT" | "SIMULATION" | "UNSPECIFIED_LEGACY" | null;
  pretest: { correct: number; total: number } | null; posttest: { correct: number; total: number } | null;
};
export type ResultSession = {
  id: string; participantId: string; stationId: string; kind: StudyKind; sequence: number; status: StudyPhase;
  createdAt: string; updatedAt: string; cohortId: string; appVersion: string; materialVersion: string;
  instrumentVersion: string; instrumentStatus: string; profileId: string; flowVersion: string; blocks: ResultBlock[];
};
export type ResultsOverview = { fetchedAt: string; sessions: ResultSession[] };
export type SourceStats = {
  source: "REAL" | "SIMULATION"; samples: number; noFace: number; invalid: number;
  triggers: number; closed: number; ignored: number; focusChosen: number; assistedChosen: number;
  modeChanges: number; offered: number; accepted: number; dismissed: number; manualOverrides: number;
  minutes: number; modeMs: { DEFAULT: number; FOCUS: number; ASSISTED: number };
};
export type ResultDetail = {
  session: ResultSession;
  blocks: { id: string; items: { id: string; dimension: CLTDimension; text: string | null; answer: number | null }[]; stats: SourceStats[] }[];
};
export function resultSession(study: StudyRecord, cohortId: string): ResultSession {
  return {
    id: study.id, participantId: study.participantId, stationId: study.stationId, kind: study.kind,
    sequence: study.sequence, status: study.status, createdAt: study.createdAt, updatedAt: study.updatedAt,
    cohortId, appVersion: study.appVersion, materialVersion: study.materialVersion,
    instrumentVersion: study.questionnaire.version, instrumentStatus: study.questionnaire.status,
    profileId: study.profileId, flowVersion: study.flowVersion ?? "CLT_THEN_POSTTEST",
    blocks: study.blocks.map((block): ResultBlock => {
      const valid = block.clt && Object.keys(block.clt.answers).length === 15 && Object.values(block.clt.answers).every((value) => Number.isInteger(value) && value >= 1 && value <= 9)
        && ["ICL", "ECL", "GCL"].every((dimension) => Number.isFinite(block.clt!.scores[dimension as CLTDimension]) && block.clt!.scores[dimension as CLTDimension] >= 1 && block.clt!.scores[dimension as CLTDimension] <= 9);
      return { id: block.id, order: block.order, condition: block.condition, materialId: block.materialId,
        materialTitle: study.materials.find((item) => item.id === block.materialId)?.title ?? block.materialId,
        completedAt: block.completedAt, scores: valid ? block.clt!.scores : null,
        cltSubmittedAt: block.clt?.submittedAt, cltDurationMs: block.clt?.durationMs,
        responseSource: block.clt ? block.clt.responseSource ?? "UNSPECIFIED_LEGACY" : null,
        pretest: block.pretest ? { correct: block.pretest.correct, total: block.pretest.total } : null,
        posttest: block.posttest ? { correct: block.posttest.correct, total: block.posttest.total } : null,
      };
    }),
  };
}
export function completePair(session: ResultSession, includeSimulation = false) {
  return session.status === "COMPLETED" && session.blocks.length === 2
    && (["ADAPTIVE", "NON_ADAPTIVE"] as const).every((condition) => session.blocks.some((block) => block.condition === condition))
    && session.blocks.every((block) => block.completedAt && block.scores && block.pretest && block.posttest && block.pretest.total > 0 && block.posttest.total > 0 && (includeSimulation || block.responseSource !== "SIMULATION"));
}
export function mean(values: number[]): number | null {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}
export function eventStats(events: StudyEvent[], blockId: string): SourceStats[] {
  return (["REAL", "SIMULATION"] as const).map((source) => {
    const selected = events.filter((event) => event.blockId === blockId && event.payload.source === source);
    const predictions = selected.filter((event) => event.type === "FER_PREDICTION");
    const summaries = selected.filter((event) => event.type === "MINUTE_SUMMARY");
    const count = (type: string) => selected.filter((event) => event.type === type).length;
    const modeMs = Object.fromEntries(["DEFAULT", "FOCUS", "ASSISTED"].map((mode) => [mode, summaries.reduce((sum, event) => {
      const value = Number((event.payload.modeMs as Record<string, unknown> | undefined)?.[mode] ?? 0);
      return sum + (Number.isFinite(value) && value >= 0 ? value : 0);
    }, 0)])) as SourceStats["modeMs"];
    return { source, samples: predictions.length, noFace: predictions.filter((event) => event.payload.predictionStatus === "no_face").length,
      invalid: predictions.filter((event) => event.payload.predictionStatus === "invalid_prediction").length,
      triggers: count("FER_TRIGGER"), closed: count("ADAPTATION_OFFER_CLOSED"), ignored: count("ADAPTATION_OFFER_IGNORED"),
      focusChosen: selected.filter((event) => event.type === "ADAPTATION_CHOICE" && event.payload.choice === "FOCUS").length,
      assistedChosen: selected.filter((event) => event.type === "ADAPTATION_CHOICE" && event.payload.choice === "ASSISTED").length,
      modeChanges: count("UI_MODE_CHANGED"), offered: count("ASSISTANCE_OFFERED") + count("ADAPTATION_OFFERED"),
      accepted: count("ASSISTANCE_ACCEPTED") + selected.filter((event) => event.type === "ADAPTATION_CHOICE" && ["FOCUS", "ASSISTED"].includes(String(event.payload.choice))).length,
      dismissed: count("ASSISTANCE_DISMISSED") + selected.filter((event) => event.type === "ADAPTATION_CHOICE" && event.payload.choice === "TIDAK").length, manualOverrides: count("MANUAL_OVERRIDE"), minutes: summaries.length, modeMs };
  });
}

import type { AggregationConfig, ExperimentCondition } from "../aui/types";
import type { AUIProfileId } from "../aui/config";
import type { CLTScores, QuestionnaireDefinition, CLTResponseSource } from "./clt";
import type { ResearchMaterial } from "./content";

export type MaterialId = "sampling-bias" | "correlation-causation";
export type StudyPhase = "CHECK_IN" | "PRETEST" | "LEARNING" | "CLT" | "POSTTEST" | "BREAK" | "COMPLETED" | "INCOMPLETE";
export type StudyKind = "TEST" | "PILOT" | "MAIN";
export type Answers = Record<string, number>;
export type AssessmentQuestion = { id: string; objective: string; prompt: string; options: string[] };
export type AssessmentDefinition = {
  id: string; materialId: MaterialId; phase: "PRETEST" | "POSTTEST"; version: string;
  questions: AssessmentQuestion[]; key: Answers;
};
export type AssessmentResponse = { answers: Answers; submittedAt: string; correct: number; total: number };
export type StudyBlock = {
  id: string; order: 1 | 2; materialId: MaterialId; condition: ExperimentCondition;
  phaseTimes: Partial<Record<StudyPhase, string>>;
  drafts: Partial<Record<"PRETEST" | "CLT" | "POSTTEST", Answers>>;
  pretest?: AssessmentResponse; posttest?: AssessmentResponse;
  clt?: { answers: Answers; scores: CLTScores; startedAt?: string; durationMs?: number; submittedAt: string; instrumentVersion: string; responseSource?: CLTResponseSource };
  cltDraftSource?: CLTResponseSource;
  cltSkippedForTest?: boolean; completedAt?: string;
};
export type StudyRecord = {
  schemaVersion: 1; id: string; participantId: string; stationId: string; kind: StudyKind; sequence: 1 | 2 | 3 | 4;
  createdAt: string; updatedAt: string; endedAt?: string; status: StudyPhase; currentBlock: number;
  consent?: { acceptedAt: string; priorKnowledge: string };
  appVersion: string; materialVersion: string; assessmentVersion: string; methodologyVersion: string;
  /** Missing on historical sessions, which retain their original CLT-first flow. */
  flowVersion?: "POSTTEST_THEN_CLT" | "CLT_THEN_POSTTEST";
  allocation?: { version: string; digest: string };
  cameraActivation?: "AUTO_LEARNING";
  protocolVersion?: string;
  protocolAcknowledgedAt?: string;
  cltPresentationVersion?: string;
  profileId: AUIProfileId; config: Readonly<AggregationConfig>; questionnaire: QuestionnaireDefinition;
  assessments: AssessmentDefinition[]; blocks: StudyBlock[];
  materials: ResearchMaterial[];
  interruptions: { at: string; blockId: string; reason: string }[];
};
export type PublicStudy = Omit<StudyRecord, "assessments" | "blocks"> & {
  assessments: Omit<AssessmentDefinition, "key">[];
  blocks: (Omit<StudyBlock, "pretest" | "posttest" | "clt"> & {
    pretest?: { answers: Answers; submittedAt: string };
    posttest?: { answers: Answers; submittedAt: string };
    clt?: { answers: Answers; submittedAt: string; instrumentVersion: string; responseSource?: CLTResponseSource };
  })[];
};
export type StudyEvent = {
  id: string; blockId: string; episodeId: string; timestamp: string; type: string; payload: Record<string, unknown>;
};

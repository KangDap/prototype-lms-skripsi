import type { PublicStudy, StudyRecord, MaterialId } from "./types";
import type { Course } from "../lms/types";

export const ACTIVE_STUDY_KEY = "lms-active-study-v1";
export const ENTRY_ATTEMPT_KEY = "lms-entry-attempt-v1";
export const RESEARCH_COURSE_ID = "literasi-data";
export const RESEARCH_COURSE_PATH = `/courses/${RESEARCH_COURSE_ID}`;
export const RESEARCH_SETTINGS_PATH = "/profile/settings";
export function materialPath(id: string) { return `${RESEARCH_COURSE_PATH}/materials/${id}`; }
export function materialLetter(id: MaterialId) { return id === "sampling-bias" ? "A" : "B"; }
export function nextMaterial(study: PublicStudy) { return study.blocks[study.status === "BREAK" ? 1 : study.currentBlock]; }
export function withStudyProgress(course: Course, study: PublicStudy | null): Course {
  if (!study || course.id !== RESEARCH_COURSE_ID) return course;
  return { ...course, materials: study.blocks.map((block) => ({
    id: block.materialId, title: study.materials.find((item) => item.id === block.materialId)?.title ?? block.materialId,
    durationMinutes: 15, introduction: study.materials.find((item) => item.id === block.materialId)?.introduction ?? "",
    completed: Boolean(block.completedAt),
  })) };
}
export function studyFlow(study: Pick<StudyRecord, "flowVersion">) { return study.flowVersion ?? "CLT_THEN_POSTTEST"; }

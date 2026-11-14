import type { Assignment, Course, RecentActivity } from "./types";
import { RESEARCH_MATERIALS } from "../research/content";

// The research session carries the participant code; no fabricated study history.
export const student = { name: "Peserta penelitian", initials: "PP", email: "", program: "Mahasiswa Saintek" };
export const courses: Course[] = [{
  id: "literasi-data", code: "STAT-01", title: "Literasi dan Interpretasi Data",
  description: "Menilai kualitas sampel, membaca hubungan antarvariabel, dan mengevaluasi kesimpulan berbasis data.",
  lecturer: "Tim Peneliti", lecturerInitials: "TP", category: "Lintas disiplin Saintek", artwork: "mathematics",
  materials: RESEARCH_MATERIALS.map((material) => ({ id: material.id, title: material.title, durationMinutes: 15,
    completed: false, introduction: material.introduction })),
  meetings: [],
}];
// Assessments belong to the study flow, without artificial deadlines or histories.
export const assignments: Assignment[] = [];
export const recentActivities: RecentActivity[] = [];

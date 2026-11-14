import type { StudyBlock, MaterialId } from "./types";

export const APP_VERSION = "research-2026-11-14-v8";
export const MATERIAL_VERSION = "statistics-id-draft-4";
export const ASSESSMENT_VERSION = "statistics-tests-draft-2";
// Review with the supervisor after pilot; changing to APPROVED requires an explicit version bump.
export const METHODOLOGY = {
  version: "within-subject-approved-1",
  status: "APPROVED" as "DRAFT" | "APPROVED",
  pretestPlacement: "BEFORE_EACH_BLOCK",
  flowVersion: "POSTTEST_THEN_CLT" as const,
  assessmentForm: "PARALLEL_DRAFT",
  questionsPerTest: 8,
  targetLearningMinutes: 15,
  maxSessionMinutes: 60,
  automaticTimeLimit: false,
  pending: [
    "Penempatan pretest sebelum tiap blok atau keduanya di awal sesi.",
    "Peninjauan kualitas dan kesetaraan 8 soal A–E per tes, berbobot sama.",
    "Timeout tawaran 30 detik dan suppression 30 detik adalah kandidat pilot, perlu konfirmasi.",
    "Recovery sinyal mempertahankan mode pilihan pengguna; protokol persetujuan perlu ditinjau.",
    "Durasi final, aturan penghentian, dan penanganan sesi belum selesai.",
    "Kesetaraan materi lintas jurusan dan profil AUI hasil pilot.",
    "Metode analisis pretest–posttest sebagai hasil pendukung.",
  ],
};

export function sequenceBlocks(sequence: 1 | 2 | 3 | 4): StudyBlock[] {
  const first: MaterialId = sequence < 3 ? "sampling-bias" : "correlation-causation";
  const second: MaterialId = first === "sampling-bias" ? "correlation-causation" : "sampling-bias";
  return [first, second].map((materialId, index) => ({
    id: crypto.randomUUID(), order: (index + 1) as 1 | 2, materialId,
    condition: (sequence % 2 === 1) === (index === 0) ? "ADAPTIVE" : "NON_ADAPTIVE",
    phaseTimes: {}, drafts: {},
  }));
}

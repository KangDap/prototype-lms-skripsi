export const CLT_DIMENSIONS = ["ICL", "ECL", "GCL"] as const;
export type CLTDimension = (typeof CLT_DIMENSIONS)[number];
export type CanonicalCLTItemId = `${"ICL" | "ECL"}${1 | 2 | 3 | 4 | 5}` | `GCL${1 | 3 | 5 | 6 | 7}`;
/** GCL2/GCL4 are accepted only in historical sequential-ID questionnaire snapshots. */
export type CLTItemId = CanonicalCLTItemId | "GCL2" | "GCL4";
export type CLTScores = Record<CLTDimension, number>;
export type CLTResponseSource = "PARTICIPANT" | "SIMULATION";
export type CLTItem = { id: CLTItemId; dimension: CLTDimension; sourceLabel: string; sourceItem: number; text: string | null };
export type QuestionnaireDefinition = {
  id: string; doi: string; version: string; language: string; status: "DRAFT" | "APPROVED"; items: CLTItem[];
  itemIdScheme?: "SOURCE" | "SEQUENTIAL_LEGACY"; title?: string; instructions?: string[];
  scale: { min: 1; max: 9; lowerLabel: string; upperLabel: string }; primaryOutcome: "ECL";
};

export const CLT_ITEM_IDS: readonly CanonicalCLTItemId[] = [
  "ICL1", "ICL2", "ICL3", "ICL4", "ICL5",
  "ECL1", "ECL2", "ECL3", "ECL4", "ECL5",
  "GCL1", "GCL3", "GCL5", "GCL6", "GCL7",
];

// Verbatim Indonesian draft supplied by the researcher; not a validated translation claim.
export const CLT_INDONESIAN_TEXT: Record<CanonicalCLTItemId, string | null> = {
  ICL1: "Isi materi pembelajaran sulit saya pahami.",
  ICL2: "Penjelasan mengenai isi materi pembelajaran sulit saya pahami.",
  ICL3: "Isi materi pembelajaran memiliki tingkat kompleksitas yang tinggi.",
  ICL4: "Materi pembelajaran memuat banyak informasi yang kompleks.",
  ICL5: "Tanpa pengetahuan sebelumnya, informasi dalam materi pembelajaran sulit saya pahami.",
  ECL1: "Saya kesulitan memperoleh gambaran umum mengenai struktur materi pembelajaran.",
  ECL2: "Desain penyajian materi pembelajaran membuat saya sulit memahami hubungan antara bagian-bagian informasi.",
  ECL3: "Desain materi pembelajaran terasa kurang nyaman digunakan.",
  ECL4: "Desain penyajian materi pembelajaran menyulitkan saya menemukan informasi yang relevan dengan cepat.",
  ECL5: "Akibat desain penyajian materi pembelajaran, saya merasa sulit berkonsentrasi pada isi materi.",
  GCL1: "Saya secara aktif memikirkan isi materi yang dipelajari.",
  GCL3: "Saya berusaha memahami isi materi pembelajaran.",
  GCL5: "Saya memperoleh pemahaman yang menyeluruh tentang isi materi pembelajaran.",
  GCL6: "Saya dapat memperluas pengetahuan yang sudah saya miliki melalui materi pembelajaran.",
  GCL7: "Saya dapat menerapkan pengetahuan yang diperoleh dari materi pembelajaran dengan cepat dan tepat.",
};

export const CLT_DEFINITION: QuestionnaireDefinition = {
  id: "krieglstein-2023-table-11", doi: "10.1007/s10648-023-09738-0",
  version: "id-source-approved-1", language: "id", status: "APPROVED", itemIdScheme: "SOURCE",
  title: "Kuesioner Beban Kognitif",
  instructions: [
    "Kuesioner ini bertujuan mengetahui pengalaman Anda selama mengikuti sesi pembelajaran yang baru saja diselesaikan.",
    "Bacalah setiap pernyataan dengan saksama, kemudian pilih angka yang paling sesuai dengan pengalaman Anda selama mempelajari materi yang diberikan.",
    "Tidak ada jawaban benar atau salah. Jawablah setiap pernyataan berdasarkan pengalaman Anda sendiri.",
  ],
  scale: { min: 1, max: 9, lowerLabel: "Sangat tidak sesuai", upperLabel: "Sepenuhnya sesuai" }, primaryOutcome: "ECL",
  items: CLT_ITEM_IDS.map((id) => {
    const dimension = id.slice(0, 3) as CLTDimension;
    const n = Number(id.slice(3));
    return { id, dimension, sourceLabel: id, sourceItem: dimension === "ICL" ? n : dimension === "ECL" ? n + 5 : n + 10, text: CLT_INDONESIAN_TEXT[id] };
  }),
};

export function validateQuestionnaireDefinition(definition: QuestionnaireDefinition) {
  if (definition.scale.min !== 1 || definition.scale.max !== 9) throw new Error("Skala CLT harus 1–9.");
  const sourceIds = definition.itemIdScheme === "SOURCE";
  const expected = sourceIds ? CLT_ITEM_IDS : CLT_DIMENSIONS.flatMap((dimension) => Array.from({ length: 5 }, (_, index) => dimension + (index + 1)));
  if (definition.items.length !== 15 || new Set(definition.items.map((item) => item.id)).size !== 15 ||
    expected.some((id) => !definition.items.some((item) => item.id === id && item.dimension === id.slice(0, 3))))
    throw new Error("Definisi CLT harus berisi 15 ID tetap, lima per dimensi.");
  for (const item of definition.items) {
    const n = Number(item.id.slice(3));
    const sourceN = item.dimension === "GCL" && !sourceIds ? [1, 3, 5, 6, 7][n - 1] : n;
    const originalNumber = item.dimension === "ICL" ? sourceN : item.dimension === "ECL" ? sourceN + 5 : sourceN + 10;
    if (item.sourceLabel !== item.dimension + sourceN || item.sourceItem !== originalNumber)
      throw new Error("Pemetaan butir asli Table 11 berubah.");
  }
}
export function questionnaireComplete(definition: QuestionnaireDefinition) {
  try { validateQuestionnaireDefinition(definition); } catch { return false; }
  return definition.items.every((item) => typeof item.text === "string" && Boolean(item.text.trim()));
}
export function questionnaireReady(definition: QuestionnaireDefinition) {
  return definition.status === "APPROVED" && questionnaireComplete(definition);
}
export function questionnaireUsable(definition: QuestionnaireDefinition, kind: "TEST" | "PILOT" | "MAIN") {
  return kind === "MAIN" ? questionnaireReady(definition) : questionnaireComplete(definition);
}
export function validateCLTAnswers(input: unknown, definition: QuestionnaireDefinition, complete = true): Record<string, number> {
  validateQuestionnaireDefinition(definition);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Jawaban CLT harus berupa objek.");
  const answers = input as Record<string, unknown>;
  const ids = definition.items.map((item) => item.id);
  if (complete && Object.keys(answers).length !== 15) throw new Error("Seluruh 15 butir CLT wajib diisi.");
  for (const [id, value] of Object.entries(answers)) {
    if (!ids.includes(id as CLTItemId) || typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 9)
      throw new Error("Jawaban CLT harus memakai ID yang dikenal dan bilangan bulat 1–9.");
  }
  if (complete && ids.some((id) => answers[id] === undefined)) throw new Error("Seluruh 15 butir CLT wajib diisi.");
  return answers as Record<string, number>;
}
export function scoreCLT(input: unknown, definition: QuestionnaireDefinition): CLTScores {
  const answers = validateCLTAnswers(input, definition);
  return Object.fromEntries(CLT_DIMENSIONS.map((dimension) => [dimension,
    definition.items.filter((item) => item.dimension === dimension).reduce((sum, item) => sum + answers[item.id], 0) / 5,
  ])) as CLTScores;
}
/** Test fixtures contain answer numbers only; never submit automatically or use in MAIN/PILOT. */
export function simulatedCLTAnswers(definition: QuestionnaireDefinition, preset: "MIN" | "MAX" | "MIXED") {
  validateQuestionnaireDefinition(definition);
  return Object.fromEntries(definition.items.map((item) => [item.id, preset === "MIN" ? 1 : preset === "MAX" ? 9 : item.dimension === "ICL" ? 3 : item.dimension === "ECL" ? 5 : 7]));
}

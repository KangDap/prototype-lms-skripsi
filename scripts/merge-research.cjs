/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local data utility. */
// Usage: node scripts/merge-research.cjs <folder-with-JSON-exports> <new-output-folder> [TEST|PILOT|MAIN]
const { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } = require("node:fs");
const { resolve, join } = require("node:path");
const { createHash } = require("node:crypto");
const dimensions = ["ICL", "ECL", "GCL"];
const csvCell = (value) => {
  let text = value == null ? "" : String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
const csv = (rows) => "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
function main() {
  const [inputArg, outputArg, kind = "MAIN"] = process.argv.slice(2);
  if (!inputArg || !outputArg || !["TEST", "PILOT", "MAIN"].includes(kind)) throw new Error("Gunakan: node scripts/merge-research.cjs <folder-input> <folder-output-baru> [TEST|PILOT|MAIN]");
  const input = resolve(inputArg); const output = resolve(outputArg);
  if (existsSync(output)) throw new Error("Folder output sudah ada. Pilih folder baru agar hasil sebelumnya tidak tertimpa.");
  const sessions = new Map(); const participants = new Map(); const signatures = new Set(); const ignored = [];
  for (const name of readdirSync(input).filter((item) => item.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(join(input, name), "utf8"));
    if (!data.study || !Array.isArray(data.study.blocks) || !Array.isArray(data.batches)) throw new Error(`Bukan ekspor penelitian lengkap: ${name}`);
    const study = data.study;
    if (study.kind !== kind) { ignored.push(name); continue; }
    if (sessions.has(study.id)) throw new Error(`ID sesi ganda: ${study.id}. Sisakan satu ekspor terbaru untuk setiap sesi.`);
    if (participants.has(study.participantId)) throw new Error(`Kode peserta ganda: ${study.participantId}. Periksa sesi ${participants.get(study.participantId)} dan ${study.id}.`);
    if (study.blocks.length !== 2 || new Set(study.blocks.map((block) => block.condition)).size !== 2) throw new Error(`Dua kondisi tidak lengkap/valid: ${study.id}`);
    const signature = createHash("sha256").update(JSON.stringify({ appVersion: study.appVersion, materialVersion: study.materialVersion,
      assessmentVersion: study.assessmentVersion, methodologyVersion: study.methodologyVersion, flowVersion: study.flowVersion ?? "CLT_THEN_POSTTEST", questionnaire: study.questionnaire,
      materials: study.materials, assessments: study.assessments, config: study.config })).digest("hex");
    signatures.add(signature); sessions.set(study.id, data); participants.set(study.participantId, study.id);
  }
  if (!sessions.size) throw new Error(`Tidak ada sesi ${kind} pada folder input.`);
  if (signatures.size > 1) throw new Error("Versi materi, soal, instrumen, aplikasi, metodologi, atau konfigurasi AUI berbeda. Pisahkan dataset sebelum digabung.");
  const contextHeader = ["session_id", "participant_id", "station_id", "kind", "sequence", "flow_version", "allocation_version", "allocation_digest", "instrument_status", "item_id_scheme"];
  const itemRows = [[...contextHeader, "block_id", "order", "material_id", "condition", "instrument_version", "item_id", "source_label", "dimension", "answer", "source_item", "clt_started_at", "clt_submitted_at", "clt_duration_ms", "response_source"]];
  const blockRows = [[...contextHeader, "block_id", "order", "material_id", "condition", "ICL", "ECL", "GCL", "pre_correct", "pre_total", "post_correct", "post_total", "clt_complete", "block_complete", "session_status", "clt_started_at", "clt_submitted_at", "clt_duration_ms", "response_source"]];
  const pairedRows = [[...contextHeader, "paired_complete", ...["ADAPTIVE", "NON_ADAPTIVE"].flatMap((condition) => ["material", "order", "ICL", "ECL", "GCL", "pre_correct", "post_correct", "clt_duration_ms", "response_source"].map((column) => `${condition}_${column}`))]];
  for (const { study } of sessions.values()) {
    const context = [study.id, study.participantId, study.stationId, study.kind, study.sequence, study.flowVersion ?? "CLT_THEN_POSTTEST", study.allocation?.version, study.allocation?.digest, study.questionnaire.status, study.questionnaire.itemIdScheme ?? "SEQUENTIAL_LEGACY"];
    for (const block of study.blocks) {
      const cltTiming = [block.clt?.startedAt, block.clt?.submittedAt, block.clt?.durationMs, block.clt?.responseSource ?? (block.clt ? "UNSPECIFIED_LEGACY" : undefined)];
      for (const item of study.questionnaire.items) itemRows.push([...context, block.id, block.order, block.materialId, block.condition, study.questionnaire.version, item.id, item.sourceLabel, item.dimension, block.clt?.answers[item.id], item.sourceItem, ...cltTiming]);
      blockRows.push([...context, block.id, block.order, block.materialId, block.condition, ...dimensions.map((dimension) => block.clt?.scores[dimension]),
        block.pretest?.correct, block.pretest?.total, block.posttest?.correct, block.posttest?.total, Boolean(block.clt), Boolean(block.completedAt && block.clt), study.status, ...cltTiming]);
    }
    pairedRows.push([...context, study.blocks.every((block) => Boolean(block.completedAt && block.clt)), ...["ADAPTIVE", "NON_ADAPTIVE"].flatMap((condition) => {
      const block = study.blocks.find((item) => item.condition === condition);
      return [block.materialId, block.order, ...dimensions.map((dimension) => block.clt?.scores[dimension]), block.pretest?.correct, block.posttest?.correct, block.clt?.durationMs, block.clt?.responseSource ?? (block.clt ? "UNSPECIFIED_LEGACY" : undefined)];
    })]);
  }
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "items.csv"), csv(itemRows), { flag: "wx" });
  writeFileSync(join(output, "blocks.csv"), csv(blockRows), { flag: "wx" });
  writeFileSync(join(output, "paired.csv"), csv(pairedRows), { flag: "wx" });
  writeFileSync(join(output, "sessions.json"), JSON.stringify({ kind, mergedAt: new Date().toISOString(), sessions: [...sessions.values()], ignored }, null, 2), { flag: "wx" });
  process.stdout.write(`Tersimpan: ${sessions.size} sesi ${kind}. Baris belum lengkap tetap ditandai; nilai kosong tidak diganti nol.\n`);
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }

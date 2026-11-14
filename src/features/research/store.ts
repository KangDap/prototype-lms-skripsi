import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, truncate } from "node:fs/promises";
import path from "node:path";
import { AUI_PROFILES, DEFAULT_PILOT_PROFILE, USER_APPROVED_CONFIG, type AUIProfileId } from "../aui/config";
import { ferConfig } from "../fer/config";
import { CLT_DEFINITION, questionnaireReady, questionnaireUsable, questionnaireComplete, scoreCLT, validateCLTAnswers, type CLTResponseSource } from "./clt";
import { ASSESSMENTS, validateAssessmentAnswers } from "./assessments";
import { APP_VERSION, ASSESSMENT_VERSION, MATERIAL_VERSION, METHODOLOGY, sequenceBlocks } from "./protocol";
import { RESEARCH_MATERIALS } from "./content";
import type { Answers, PublicStudy, StudyEvent, StudyKind, StudyPhase, StudyRecord } from "./types";
import { readAllocation } from "./allocation-store";
import { normalizeCode } from "./allocation-schema";
import { eventStats, resultSession, type ResultDetail, type ResultsOverview } from "./results-model";

type Stored = { tokenHash: string; entryRequestId?: string; operations: string[]; study: StudyRecord };
type JournalBatch = { operationId: string; receivedAt: string; participantId: string; stationId: string; studyId: string; blockId: string; materialId: string; condition: string; order: number; events: StudyEvent[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const globals = globalThis as typeof globalThis & { researchWriteQueue?: Promise<unknown> };
export function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = (globals.researchWriteQueue ?? Promise.resolve()).catch(() => undefined).then(work);
  globals.researchWriteQueue = next.catch(() => undefined);
  return next;
}
function directory() {
  // Research records are runtime files on each lab PC; never bundle their contents.
  const dir = path.resolve(/* turbopackIgnore: true */ process.env.RESEARCH_DATA_DIR || path.join(process.cwd(), ".research-data"));
  const publicDir = path.resolve(process.cwd(), "public");
  if (dir === publicDir || dir.startsWith(publicDir + path.sep)) throw new Error("Data penelitian harus berada di luar public.");
  return dir;
}
function file(id: string, suffix = "json") {
  if (!UUID.test(id)) throw new Error("ID sesi tidak valid.");
  return path.join(/* turbopackIgnore: true */ directory(), `${id}.${suffix}`);
}
function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function sameSecret(a: string, b: string) {
  const first = Buffer.from(hash(a)); const second = Buffer.from(hash(b));
  return timingSafeEqual(first, second);
}
async function load(id: string): Promise<Stored> { return JSON.parse(await readFile(/* turbopackIgnore: true */ file(id), "utf8")) as Stored; }
async function save(stored: Stored) {
  await mkdir(directory(), { recursive: true });
  const destination = file(stored.study.id);
  const temporary = `${destination}.tmp`;
  const handle = await open(temporary, "w", 0o600);
  try { await handle.writeFile(JSON.stringify(stored)); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, destination);
}
function publicStudy(study: StudyRecord): PublicStudy {
  return { ...study, assessments: study.assessments.map(({ id, materialId, phase, version, questions }) => ({ id, materialId, phase, version, questions })),
    blocks: study.blocks.map(({ pretest, posttest, clt, ...block }) => ({ ...block,
      ...(pretest ? { pretest: { answers: pretest.answers, submittedAt: pretest.submittedAt } } : {}),
      ...(posttest ? { posttest: { answers: posttest.answers, submittedAt: posttest.submittedAt } } : {}),
      ...(clt ? { clt: { answers: clt.answers, submittedAt: clt.submittedAt, instrumentVersion: clt.instrumentVersion, responseSource: clt.responseSource } } : {}),
    })),
  };
}
async function participant(id: string, token: string) {
  const stored = await load(id);
  if (!token || !sameSecret(hash(token), stored.tokenHash)) throw new Error("Token sesi tidak valid. Minta peneliti memulihkan sesi.");
  return stored;
}
export async function getParticipantStudy(id: string, token: string) { return publicStudy((await participant(id, token)).study); }

export async function readiness() {
  const { manifest } = await readAllocation();
  const profileId = process.env.RESEARCH_MAIN_PROFILE;
  return { methodology: METHODOLOGY, instrumentReady: questionnaireReady(CLT_DEFINITION), instrumentComplete: questionnaireComplete(CLT_DEFINITION), instrumentVersion: CLT_DEFINITION.version,
    mainProfile: profileId && Object.hasOwn(AUI_PROFILES, profileId) ? profileId : manifest.profileApprovedForMain ? manifest.profileId : null,
    researcherKeyConfigured: Boolean(process.env.RESEARCHER_KEY), appVersion: APP_VERSION,
    profiles: Object.keys(AUI_PROFILES),
  };
}
export async function listStudies() {
  await mkdir(directory(), { recursive: true });
  const names = (await readdir(/* turbopackIgnore: true */ directory())).filter((name) => UUID.test(name.replace(/\.json$/, "")) && name.endsWith(".json"));
  const records = await Promise.all(names.map((name) => load(name.slice(0, -5))));
  return records.map(({ study }) => ({ id: study.id, participantId: study.participantId, stationId: study.stationId,
    kind: study.kind, sequence: study.sequence, status: study.status, flowVersion: study.flowVersion, createdAt: study.createdAt, updatedAt: study.updatedAt }));
}
type Admission = { token: string; requestId: string; allocation: { version: string; digest: string } };
export async function createStudy(input: Record<string, unknown>, admission?: Admission) {
  const participantId = String(input.participantId ?? "").trim();
  const stationId = String(input.stationId ?? "").trim();
  if (![participantId, stationId].every((value) => /^[a-zA-Z0-9_-]{1,40}$/.test(value))) throw new Error("Gunakan kode peserta/PC 1–40 karakter: huruf, angka, _ atau -.");
  const sequence = Number(input.sequence);
  const kind = input.kind as StudyKind;
  if (![1, 2, 3, 4].includes(sequence) || !["TEST", "PILOT", "MAIN"].includes(kind)) throw new Error("Urutan atau jenis sesi tidak valid.");
  const ready = await readiness();
  if (!questionnaireUsable(CLT_DEFINITION, kind)) throw new Error("Kuesioner belum lengkap, atau belum disetujui untuk MAIN. Gunakan TEST/PILOT untuk draf yang sudah lengkap.");
  if (kind === "MAIN" && (METHODOLOGY.status !== "APPROVED" || !ready.mainProfile || !ready.researcherKeyConfigured))
    throw new Error("MAIN diblokir: finalkan metodologi, setujui profil hasil pilot pada alokasi (atau RESEARCH_MAIN_PROFILE), dan isi RESEARCHER_KEY.");
  const profileId = (kind === "MAIN" ? ready.mainProfile : input.profileId ?? DEFAULT_PILOT_PROFILE) as AUIProfileId;
  if (kind === "MAIN" && admission && profileId !== input.profileId) throw new Error("Profil MAIN server berbeda dari konfigurasi alokasi. Samakan RESEARCH_MAIN_PROFILE atau gunakan profil yang disetujui pada alokasi.");
  if (!Object.hasOwn(AUI_PROFILES, profileId)) throw new Error("Profil AUI tidak valid.");
  const existing = await listStudies();
  if (existing.some((study) => study.participantId === participantId && study.kind === kind && !["COMPLETED", "INCOMPLETE"].includes(study.status)))
    throw new Error("Peserta memiliki sesi aktif untuk jenis ini. Pulihkan sesi tersebut terlebih dahulu.");
  const token = admission?.token ?? randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const study: StudyRecord = {
    schemaVersion: 1, id: crypto.randomUUID(), participantId, stationId, kind, sequence: sequence as 1 | 2 | 3 | 4,
    createdAt: now, updatedAt: now, status: "PRETEST", currentBlock: 0, cameraActivation: "AUTO_LEARNING", protocolVersion: "participant-guide-id-1",
    appVersion: APP_VERSION, materialVersion: MATERIAL_VERSION, assessmentVersion: ASSESSMENT_VERSION,
    methodologyVersion: METHODOLOGY.version, flowVersion: METHODOLOGY.flowVersion, profileId, config: { ...AUI_PROFILES[profileId], ...USER_APPROVED_CONFIG, samplingIntervalMs: profileId === "BASELINE" ? ferConfig.intervalMs : AUI_PROFILES[profileId].samplingIntervalMs },
    questionnaire: structuredClone(CLT_DEFINITION), cltPresentationVersion: "three-sections-id-1", assessments: structuredClone(ASSESSMENTS), materials: structuredClone(RESEARCH_MATERIALS),
    blocks: sequenceBlocks(sequence as 1 | 2 | 3 | 4), interruptions: [],
    ...(admission ? { allocation: admission.allocation } : {}),
  };
  study.blocks[0].phaseTimes.PRETEST = now;
  await save({ tokenHash: hash(token), ...(admission ? { entryRequestId: admission.requestId } : {}), operations: [], study });
  return { study: publicStudy(study), token };
}
/** Public admission: all experimental settings come from the private allocation file. */
export async function enterAllocatedStudy(input: Record<string, unknown>, existingToken: string) {
  if (Object.keys(input).some((key) => !["participantId", "stationId", "requestId", "entryToken"].includes(key))) throw new Error("Permintaan masuk tidak valid.");
  const participantId = normalizeCode(input.participantId); const stationId = normalizeCode(input.stationId);
  if (typeof input.requestId !== "string" || !UUID.test(input.requestId) || typeof input.entryToken !== "string" || !/^[a-f0-9]{64}$/.test(input.entryToken)) throw new Error("Identitas permintaan masuk tidak valid.");
  const { manifest, digest } = await readAllocation();
  const assignment = manifest.participants.find((item) => item.participantId === participantId && item.enabled);
  if (!assignment || !manifest.stations.includes(stationId)) throw new Error("Kode peserta atau kode PC tidak terdaftar/aktif.");
  const existing = (await listStudies()).filter((study) => study.participantId.toUpperCase() === participantId && study.kind === manifest.kind);
  if (existing.length > 1) throw new Error("Kode peserta memiliki beberapa sesi. Hubungi peneliti.");
  if (existing.length) {
    const stored = await load(existing[0].id);
    if (["COMPLETED", "INCOMPLETE"].includes(stored.study.status)) throw new Error("Kode peserta telah digunakan. Hubungi peneliti.");
    const candidate = [existingToken, stored.entryRequestId === input.requestId ? input.entryToken : ""].find((value) => value && sameSecret(hash(value), stored.tokenHash));
    if (!candidate || stored.study.stationId.toUpperCase() !== stationId)
      throw new Error("Sesi peserta sudah aktif. Lanjutkan di browser semula atau minta peneliti memulihkan sesi.");
    return { study: publicStudy(stored.study), token: candidate };
  }
  return createStudy({ participantId, stationId, kind: manifest.kind, profileId: manifest.profileId, sequence: assignment.sequence },
    { token: input.entryToken, requestId: input.requestId, allocation: { version: manifest.version, digest } });
}
export async function recoverStudy(id: string) {
  const stored = await load(id); const token = randomBytes(32).toString("hex");
  stored.tokenHash = hash(token);
  stored.study.interruptions.push({ at: new Date().toISOString(), blockId: stored.study.blocks[stored.study.currentBlock].id, reason: "OPERATOR_RECOVERY" });
  await save(stored);
  return { study: publicStudy(stored.study), token };
}

async function journal(id: string): Promise<JournalBatch[]> {
  let data: Buffer;
  try { data = await readFile(/* turbopackIgnore: true */ file(id, "events.jsonl")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const end = data.lastIndexOf(10) + 1;
  // A failed/unacknowledged trailing write is discarded before the next append.
  if (end < data.length) await truncate(file(id, "events.jsonl"), end);
  return data.subarray(0, end).toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as JournalBatch);
}
function validateEvents(input: unknown, study: StudyRecord): StudyEvent[] {
  if (!Array.isArray(input) || input.length > 250) throw new Error("Batch event tidak valid.");
  if (new Set(input.map((event: StudyEvent) => event?.blockId)).size > 1) throw new Error("Satu batch event harus berasal dari satu blok.");
  return input.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Event tidak valid.");
    const event = raw as StudyEvent;
    if (!UUID.test(event.id) || !UUID.test(event.episodeId) || !study.blocks.some((block) => block.id === event.blockId) ||
      !Number.isFinite(Date.parse(event.timestamp)) || !/^[A-Z_]{1,60}$/.test(event.type) || !event.payload || typeof event.payload !== "object") throw new Error("Identitas atau isi event tidak valid.");
    if (JSON.stringify(event).length > 40000 || /data:image|data:video|base64,/i.test(JSON.stringify(event.payload))) throw new Error("Event terlalu besar atau berisi media.");
    if (study.kind !== "TEST" && event.payload.source === "SIMULATION") throw new Error("Simulasi hanya boleh berada pada sesi TEST.");
    return event;
  });
}

export async function mutateStudy(id: string, token: string, operationId: string, action: string, input: Record<string, unknown>) {
  if (!UUID.test(operationId)) throw new Error("ID operasi tidak valid.");
  const stored = await participant(id, token); const study = stored.study;
  if (stored.operations.includes(operationId)) return publicStudy(study);
  const block = study.blocks[study.currentBlock];
  const now = new Date().toISOString();
  function transition(phase: StudyPhase) { study.status = phase; block.phaseTimes[phase] = now; }
  if (action === "ACK_PROTOCOL") {
    if (study.protocolVersion && !study.protocolAcknowledgedAt) {
      study.protocolAcknowledgedAt = now;
      if (study.status === "PRETEST" && study.currentBlock === 0 && !block.pretest) block.phaseTimes.PRETEST = now;
    }
    study.updatedAt = now; stored.operations.push(operationId); await save(stored); return publicStudy(study);
  }
  if (study.protocolVersion && !study.protocolAcknowledgedAt && !["RESUME", "EVENTS"].includes(action)) throw new Error("Baca panduan kegiatan terlebih dahulu.");
  const posttestFirst = study.flowVersion === "POSTTEST_THEN_CLT";
  function finishBlock() {
    block.completedAt = now;
    transition(study.currentBlock === 0 ? "BREAK" : "COMPLETED");
    if (study.currentBlock === 1) study.endedAt = now;
  }
  // A retry with a fresh operation ID cannot overwrite an already submitted questionnaire.
  if (action === "SUBMIT" && input.phase === "CLT") {
    if (input.responseSource !== undefined && !["PARTICIPANT", "SIMULATION"].includes(String(input.responseSource))) throw new Error("Sumber jawaban tidak valid.");
    if (input.responseSource === "SIMULATION" && study.kind !== "TEST") throw new Error("Jawaban simulasi hanya diizinkan pada sesi TEST.");
    const submittedBlock = study.blocks.find((item) => item.id === input.blockId);
    if (submittedBlock?.clt) {
      const answers = validateCLTAnswers(input.answers, study.questionnaire);
      if (study.questionnaire.items.some((item) => submittedBlock.clt!.answers[item.id] !== answers[item.id])) throw new Error("Kuesioner sesi ini sudah dikirim dan tidak dapat diubah.");
      stored.operations.push(operationId); await save(stored); return publicStudy(study);
    }
  }
  if (action === "EVENTS") {
    const events = validateEvents(input.events, study);
    const journalBatches = await journal(id);
    if (!journalBatches.some((batch) => batch.operationId === operationId)) {
      const ids = new Set(journalBatches.flatMap((batch) => batch.events.map((event) => event.id)));
      const batches = new Map<string, StudyEvent[]>();
      for (const event of events) if (!ids.has(event.id)) {
        ids.add(event.id); const group = batches.get(event.blockId) ?? []; group.push(event); batches.set(event.blockId, group);
      }
      const lines = [...batches].map(([blockId, group]) => {
        const context = study.blocks.find((item) => item.id === blockId)!;
        return JSON.stringify({ operationId, receivedAt: now, participantId: study.participantId, stationId: study.stationId,
          studyId: study.id, blockId, materialId: context.materialId, condition: context.condition, order: context.order, events: group } satisfies JournalBatch);
      });
      if (lines.length) {
        const handle = await open(/* turbopackIgnore: true */ file(id, "events.jsonl"), "a", 0o600);
        try { await handle.writeFile(lines.join("\n") + "\n"); await handle.sync(); } finally { await handle.close(); }
      }
    }
  } else if (action === "RESUME") {
    if (study.status === "LEARNING") study.interruptions.push({ at: now, blockId: block.id, reason: "PAGE_RELOAD_OR_RESUME_FRESH_FER_WINDOW" });
  } else if (action === "CONSENT") {
    if (study.status !== "CHECK_IN" || input.accepted !== true) throw new Error("Persetujuan diperlukan sebelum sesi dimulai.");
    study.consent = { acceptedAt: now, priorKnowledge: String(input.priorKnowledge ?? "").slice(0, 1000) };
    transition("PRETEST");
  } else if (action === "START_MATERIAL") {
    if (study.status !== "CHECK_IN") throw new Error("Materi sudah dimulai.");
    // Compatibility for old sessions: remove the application approval step without fabricating consent.
    study.cameraActivation = "AUTO_LEARNING"; transition("PRETEST");
  } else if (action === "DRAFT" || action === "SUBMIT") {
    if (input.blockId !== block.id || input.phase !== study.status || !["PRETEST", "CLT", "POSTTEST"].includes(study.status)) throw new Error("Fase formulir sudah berubah. Muat kembali sesi.");
    const phase = study.status as "PRETEST" | "CLT" | "POSTTEST";
    const definition = study.assessments.find((item) => item.materialId === block.materialId && item.phase === phase);
    const answers: Answers = phase === "CLT" ? validateCLTAnswers(input.answers, study.questionnaire, action === "SUBMIT")
      : validateAssessmentAnswers(input.answers, definition!, action === "SUBMIT");
    block.drafts[phase] = answers;
    let responseSource: CLTResponseSource = block.cltDraftSource === "SIMULATION" ? "SIMULATION" : "PARTICIPANT";
    if (phase === "CLT") {
      if (input.responseSource !== undefined && !["PARTICIPANT", "SIMULATION"].includes(String(input.responseSource))) throw new Error("Sumber jawaban tidak valid.");
      if (input.responseSource === "SIMULATION") responseSource = "SIMULATION";
      if (responseSource === "SIMULATION" && study.kind !== "TEST") throw new Error("Jawaban simulasi hanya diizinkan pada sesi TEST.");
      block.cltDraftSource = responseSource;
    }
    if (action === "SUBMIT") {
      if (phase === "CLT") {
        if (!questionnaireUsable(study.questionnaire, study.kind)) throw new Error("Kuesioner belum lengkap atau belum disetujui untuk jenis sesi ini.");
        const startedAt = block.phaseTimes.CLT ?? now;
        block.clt = { answers, scores: scoreCLT(answers, study.questionnaire), startedAt, durationMs: Math.max(0, Date.parse(now) - Date.parse(startedAt)), submittedAt: now, instrumentVersion: study.questionnaire.version, responseSource };
        if (posttestFirst) finishBlock(); else transition("POSTTEST");
      } else {
        const response = { answers, submittedAt: now, total: definition!.questions.length,
          correct: definition!.questions.filter((q) => answers[q.id] === definition!.key[q.id]).length };
        if (phase === "PRETEST") { block.pretest = response; transition("LEARNING"); }
        else { block.posttest = response; if (posttestFirst) transition("CLT"); else finishBlock(); }
      }
    }
  } else if (action === "END_LEARNING") {
    if (study.status !== "LEARNING" || input.blockId !== block.id) throw new Error("Sesi belajar tidak aktif.");
    transition(posttestFirst ? "POSTTEST" : "CLT");
  } else if (action === "SKIP_DRAFT_CLT") {
    if (study.kind !== "TEST" || study.status !== "CLT" || questionnaireComplete(study.questionnaire)) throw new Error("Langkah ini hanya untuk CLT belum tersedia pada TEST.");
    block.cltSkippedForTest = true;
    if (posttestFirst) finishBlock(); else transition("POSTTEST");
  } else if (action === "NEXT_BLOCK") {
    if (study.status !== "BREAK" || study.currentBlock !== 0) throw new Error("Blok berikutnya belum tersedia.");
    study.currentBlock = 1; study.status = "PRETEST"; study.blocks[1].phaseTimes.PRETEST = now;
  } else throw new Error("Operasi tidak dikenal.");
  stored.operations.push(operationId); study.updatedAt = now;
  await save(stored);
  return publicStudy(study);
}
export async function endStudy(id: string) {
  const stored = await load(id);
  if (!["COMPLETED", "INCOMPLETE"].includes(stored.study.status)) {
    stored.study.status = "INCOMPLETE"; stored.study.endedAt = new Date().toISOString(); stored.study.updatedAt = stored.study.endedAt;
    await save(stored);
  }
  return publicStudy(stored.study);
}
export async function exportStudy(id: string) { return { study: (await load(id)).study, batches: await journal(id) }; }

/** Separate researcher-only projections; never add scores to publicStudy(). */
function resultsCohort(study: StudyRecord) {
  return createHash("sha256").update(JSON.stringify({ appVersion: study.appVersion, materialVersion: study.materialVersion,
    assessmentVersion: study.assessmentVersion, methodologyVersion: study.methodologyVersion,
    flowVersion: study.flowVersion ?? "CLT_THEN_POSTTEST", config: study.config,
    questionnaire: study.questionnaire, materials: study.materials, assessments: study.assessments })).digest("hex");
}
export async function getResultsOverview(): Promise<ResultsOverview> {
  await mkdir(directory(), { recursive: true });
  const names = (await readdir(/* turbopackIgnore: true */ directory())).filter((name) => name.endsWith(".json") && UUID.test(name.slice(0, -5)));
  const records = await Promise.all(names.map((name) => load(name.slice(0, -5))));
  return { fetchedAt: new Date().toISOString(), sessions: records.map(({ study }) => resultSession(study, resultsCohort(study))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}
export async function getResultsDetail(id: string): Promise<ResultDetail> {
  const { study } = await load(id);
  const events = (await journal(id)).flatMap((batch) => batch.events);
  return { session: resultSession(study, resultsCohort(study)), blocks: study.blocks.map((block) => ({ id: block.id,
    items: study.questionnaire.items.map((item) => ({ id: item.id, dimension: item.dimension, text: item.text, answer: block.clt?.answers[item.id] ?? null })),
    stats: eventStats(events, block.id),
  })) };
}

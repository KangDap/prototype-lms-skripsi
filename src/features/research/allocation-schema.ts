import { AUI_PROFILES, type AUIProfileId } from "../aui/config";
import type { StudyKind } from "./types";

export type AllocationManifest = {
  schemaVersion: 1; version: string; kind: StudyKind; profileId: AUIProfileId;
  profileApprovedForMain: boolean; stations: string[];
  participants: { participantId: string; sequence: 1 | 2 | 3 | 4; enabled: boolean }[];
};
export function normalizeCode(value: unknown): string {
  if (typeof value !== "string") throw new Error("Kode harus berupa teks.");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) throw new Error("Kode harus 1–40 karakter huruf, angka, _ atau -.");
  return code;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Konfigurasi harus berupa objek JSON.");
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Terdapat kolom konfigurasi yang tidak dikenal.");
}
export function validateAllocation(input: unknown): AllocationManifest {
  const value = record(input);
  exactKeys(value, ["schemaVersion", "version", "kind", "profileId", "profileApprovedForMain", "stations", "participants"]);
  if (value.schemaVersion !== 1 || typeof value.version !== "string" || !/^[A-Za-z0-9._-]{1,80}$/.test(value.version)) throw new Error("Versi konfigurasi tidak valid (huruf/angka/titik/_/-; maksimal 80 karakter).");
  if (!["TEST", "PILOT", "MAIN"].includes(String(value.kind))) throw new Error("Jenis sesi harus TEST, PILOT, atau MAIN.");
  if (typeof value.profileId !== "string" || !Object.hasOwn(AUI_PROFILES, value.profileId) || typeof value.profileApprovedForMain !== "boolean") throw new Error("Profil atau status persetujuan profil tidak valid.");
  if (!Array.isArray(value.stations) || value.stations.length < 1 || value.stations.length > 100) throw new Error("Isi 1–100 kode PC yang diizinkan.");
  const stations = value.stations.map(normalizeCode);
  if (new Set(stations).size !== stations.length) throw new Error("Kode PC ganda pada konfigurasi.");
  if (!Array.isArray(value.participants) || value.participants.length < 1 || value.participants.length > 2000) throw new Error("Isi 1–2000 alokasi peserta.");
  const participants = value.participants.map((raw) => {
    const item = record(raw); exactKeys(item, ["participantId", "sequence", "enabled"]);
    if (typeof item.sequence !== "number" || ![1, 2, 3, 4].includes(item.sequence) || typeof item.enabled !== "boolean") throw new Error("Setiap peserta harus memiliki urutan 1–4 dan status aktif boolean.");
    return { participantId: normalizeCode(item.participantId), sequence: item.sequence as 1 | 2 | 3 | 4, enabled: item.enabled };
  });
  if (new Set(participants.map((item) => item.participantId)).size !== participants.length) throw new Error("Kode peserta ganda pada konfigurasi.");
  return { schemaVersion: 1, version: value.version, kind: value.kind as StudyKind, profileId: value.profileId as AUIProfileId,
    profileApprovedForMain: value.profileApprovedForMain, stations, participants };
}

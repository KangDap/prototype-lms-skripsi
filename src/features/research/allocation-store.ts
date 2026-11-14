import "server-only";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { validateAllocation, type AllocationManifest } from "./allocation-schema";

// The same file is distributed with the application to all lab PCs; never served from public.
export const ALLOCATION_PATH = path.join(process.cwd(), "config", "research-allocation.json");
function digest(manifest: AllocationManifest) { return createHash("sha256").update(JSON.stringify(manifest)).digest("hex"); }
export async function readAllocation() {
  const manifest = validateAllocation(JSON.parse((await readFile(ALLOCATION_PATH, "utf8")).replace(/^\uFEFF/, "")));
  return { manifest, digest: digest(manifest) };
}
/** Caller serializes writes and requires operator access. */
export async function saveAllocation(input: unknown, expectedDigest: unknown) {
  const current = await readAllocation();
  if (typeof expectedDigest !== "string" || expectedDigest !== current.digest) throw new Error("Konfigurasi berubah. Muat ulang sebelum menyimpan.");
  const manifest = validateAllocation(input); const nextDigest = digest(manifest);
  if (nextDigest !== current.digest && manifest.version === current.manifest.version) throw new Error("Ubah nomor versi konfigurasi sebelum menyimpan perubahan.");
  await mkdir(path.dirname(ALLOCATION_PATH), { recursive: true });
  const handle = await open(ALLOCATION_PATH + ".tmp", "w", 0o600);
  try { await handle.writeFile(JSON.stringify(manifest, null, 2) + "\n"); await handle.sync(); } finally { await handle.close(); }
  await rename(ALLOCATION_PATH + ".tmp", ALLOCATION_PATH);
  return { manifest, digest: nextDigest };
}

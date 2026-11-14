"use client";
import type { PublicStudy, StudyEvent } from "./types";

export type StudyCredentials = { id: string; token: string };
type Pending = { key?: number; studyId: string; token: string; body: Record<string, unknown> };
const DATABASE = "lms-research-outbox-v1";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("commands", { keyPath: "key", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("IndexedDB tidak tersedia. Autosave belum dapat digunakan."));
  });
}
async function pendingOperation<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("commands", mode); const request = operation(transaction.objectStore("commands"));
    transaction.oncomplete = () => { const result = request.result; db.close(); resolve(result); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error("Penyimpanan antrean lokal gagal; jangan tutup browser sebelum diperiksa.")); };
  });
}
export async function studyRequest(body: Record<string, unknown>, credentials?: StudyCredentials, researcherKey?: string): Promise<unknown> {
  const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json",
    ...(credentials ? { Authorization: `Bearer ${credentials.token}` } : {}), ...(researcherKey ? { "x-researcher-key": researcherKey } : {}) },
    body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
  const data = await response.json(); if (!response.ok) throw Object.assign(new Error(data.error ?? "Penyimpanan gagal."), { status: response.status }); return data;
}

export class StudyTransport {
  private writes: Promise<unknown> = Promise.resolve();
  private draining: Promise<void> | null = null;
  private journalPending = 0;
  private enqueueFailure: Error | null = null;
  constructor(readonly credentials: StudyCredentials, private onStudy: (study: PublicStudy) => void, private onStatus: (message: string) => void) {}
  enqueue(action: string, input: Record<string, unknown> = {}) {
    this.journalPending++;
    this.onStatus("Perubahan sedang disimpan ke antrean lokal…");
    const task = this.writes.then(() => pendingOperation("readwrite", (store) => store.add({ studyId: this.credentials.id,
      token: this.credentials.token, body: { ...input, action, id: this.credentials.id, operationId: crypto.randomUUID() } } satisfies Pending)));
    this.writes = task.catch((error: unknown) => {
      this.enqueueFailure = error instanceof Error ? error : new Error("Antrean lokal gagal.");
      this.onStatus(this.enqueueFailure.message);
    });
    return task.then(() => { this.journalPending--; this.onStatus("Tersimpan di antrean lokal; menunggu konfirmasi server."); });
  }
  async events(events: StudyEvent[]) {
    for (let offset = 0; offset < events.length; offset += 100) await this.enqueue("EVENTS", { events: events.slice(offset, offset + 100) });
  }
  flush(): Promise<void> {
    if (this.draining) return this.draining.then(() => this.flush());
    this.draining = this.drain().finally(() => { this.draining = null; });
    return this.draining;
  }
  private async drain() {
    await this.writes;
    if (this.enqueueFailure) throw this.enqueueFailure;
    try {
      while (true) {
        const all = await pendingOperation("readonly", (store) => store.getAll()) as Pending[];
        const operation = all.find((item) => item.studyId === this.credentials.id);
        if (!operation) break;
        // Rotate queued credentials after an authorized operator recovery.
        const study = await studyRequest(operation.body, this.credentials) as PublicStudy;
        await pendingOperation("readwrite", (store) => store.delete(operation.key!));
        this.onStudy(study);
        await this.writes;
        if (this.enqueueFailure) throw this.enqueueFailure;
      }
      this.onStatus(this.journalPending ? "Masih menyimpan perubahan lokal…" : "Seluruh perubahan telah dikonfirmasi tersimpan di server lokal.");
    } catch (error) {
      this.onStatus(`Belum tersimpan ke server: ${error instanceof Error ? error.message : "koneksi gagal"} Antrean lokal dipertahankan.`);
      throw error;
    }
  }
  async command(action: string, input: Record<string, unknown> = {}) {
    await this.writes;
    const all = await pendingOperation("readonly", (store) => store.getAll()) as Pending[];
    const alreadyPending = all.some((operation) => operation.studyId === this.credentials.id && operation.body.action === action &&
      operation.body.blockId === input.blockId && operation.body.phase === input.phase);
    if (!alreadyPending) await this.enqueue(action, input);
    await this.flush();
  }
}

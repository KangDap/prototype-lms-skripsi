"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyAction } from "@/lib/action-feedback";
import { ACTIVE_STUDY_KEY, ENTRY_ATTEMPT_KEY, RESEARCH_SETTINGS_PATH } from "./routing";
import { normalizeCode } from "./allocation-schema";
import { StudyTransport, type StudyCredentials } from "./transport";
import type { PublicStudy } from "./types";

type EntryAttempt = { participantId: string; stationId: string; requestId: string; entryToken: string };
export function ParticipantEntryForm() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [stationId, setStationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enter() {
    if (busy) return; setBusy(true); setError(null);
    try {
      await notifyAction(async () => {
        const code = normalizeCode(participantId); const pc = normalizeCode(stationId);
        const activeRaw = sessionStorage.getItem(ACTIVE_STUDY_KEY);
        const active = activeRaw ? JSON.parse(activeRaw) as StudyCredentials : null;
        if (active) await new StudyTransport(active, () => undefined, () => undefined).flush();
        const pendingRaw = sessionStorage.getItem(ENTRY_ATTEMPT_KEY);
        const previous = pendingRaw ? JSON.parse(pendingRaw) as EntryAttempt : null;
        const attempt: EntryAttempt = previous?.participantId === code && previous.stationId === pc ? previous : {
          participantId: code, stationId: pc, requestId: crypto.randomUUID(),
          entryToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join(""),
        };
        sessionStorage.setItem(ENTRY_ATTEMPT_KEY, JSON.stringify(attempt));
        const response = await fetch("/api/research/enter", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json", ...(active ? { Authorization: "Bearer " + active.token } : {}) }, body: JSON.stringify(attempt) });
        const data = await response.json() as { error?: string; study: PublicStudy; token: string };
        if (!response.ok) throw new Error(data.error || "Tidak dapat masuk.");
        sessionStorage.setItem(ACTIVE_STUDY_KEY, JSON.stringify({ id: data.study.id, token: data.token }));
        sessionStorage.removeItem(ENTRY_ATTEMPT_KEY);
      }, { loading: "Memeriksa kode peserta dan PC…", success: "Berhasil masuk", error: "Tidak dapat masuk" });
      router.replace("/dashboard");
    } catch (value) { setError(value instanceof Error ? value.message : "Tidak dapat masuk."); setBusy(false); }
  }
  return <main className="relative flex min-h-dvh w-full items-center justify-center px-6 py-12">
    <Link href={RESEARCH_SETTINGS_PATH} aria-label="Pengaturan penelitian" title="Pengaturan penelitian" className="absolute right-5 bottom-5 rounded-lg p-3 text-muted-foreground hover:bg-muted focus-visible:outline-2"><Settings className="size-5" aria-hidden="true" /></Link>
    <form className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-7 shadow-sm" onSubmit={(event) => { event.preventDefault(); void enter(); }}>
      <label className="block space-y-2 text-sm"><span>Kode peserta</span><input required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} pattern="[A-Za-z0-9_-]{1,40}" value={participantId} disabled={busy} onChange={(event) => setParticipantId(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 uppercase" /></label>
      <label className="block space-y-2 text-sm"><span>Kode PC</span><input required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} pattern="[A-Za-z0-9_-]{1,40}" value={stationId} disabled={busy} onChange={(event) => setStationId(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 uppercase" /></label>
      {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
      <Button disabled={busy} type="submit" className="w-full">{busy ? "Memproses…" : "Masuk"}</Button>
    </form>
  </main>;
}

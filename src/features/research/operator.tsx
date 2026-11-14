"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ActionConfirmation } from "@/components/action-confirmation";
import { notifyAction } from "@/lib/action-feedback";
import { METHODOLOGY } from "./protocol";
import { AUI_PROFILES, DEFAULT_PILOT_PROFILE } from "../aui/config";
import { ACTIVE_STUDY_KEY } from "./routing";
import { useResearchSession } from "./session-provider";
import { StudyTransport, studyRequest, type StudyCredentials } from "./transport";
import type { PublicStudy } from "./types";
import { AllocationEditor } from "./allocation-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResearchResultsDashboard } from "./results-dashboard";

type SessionSummary = Pick<PublicStudy, "id" | "participantId" | "stationId" | "kind" | "sequence" | "status" | "flowVersion">;
type Overview = { sessions: SessionSummary[]; readiness: { instrumentReady: boolean; instrumentComplete: boolean; instrumentVersion: string; mainProfile: string | null; methodology: typeof METHODOLOGY } };
const fieldClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

export function ResearchOperator({ onAccessExpired }: { onAccessExpired: () => void }) {
  const router = useRouter();
  const { activateStudy, transport: activeTransport } = useResearchSession();
  const [participantId, setParticipantId] = useState("");
  const [stationId, setStationId] = useState("");
  const [kind, setKind] = useState("TEST");
  const [sequence, setSequence] = useState("1");
  const [profileId, setProfileId] = useState<string>(DEFAULT_PILOT_PROFILE);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ action: "CREATE" | "END"; id?: string } | null>(null);

  async function flushActive(id?: string) {
    const raw = sessionStorage.getItem(ACTIVE_STUDY_KEY);
    if (!raw) return;
    const credentials = JSON.parse(raw) as StudyCredentials;
    if (id && credentials.id !== id) return;
    if (activeTransport?.credentials.id === credentials.id && activeTransport.credentials.token === credentials.token) {
      await activeTransport.flush();
    } else await new StudyTransport(credentials, () => undefined, () => undefined).flush();
  }
  async function run(work: () => Promise<void>, messages?: { loading: string; success: string }) {
    if (busy) return; setBusy(true); setError(null);
    try { if (messages) await notifyAction(work, messages); else await work(); }
    catch (value) {
      if ((value as { status?: number }).status === 401) onAccessExpired();
      setError(value instanceof Error ? value.message : "Operasi gagal.");
    } finally { setBusy(false); }
  }
  async function refresh() {
    const response = await fetch("/api/research", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401) onAccessExpired(); throw new Error(data.error); }
    setOverview(data as Overview);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/research", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
      if (active) setOverview(data as Overview);
    }).catch((value: unknown) => {
      if (!active) return;
      if ((value as { status?: number }).status === 401) onAccessExpired();
      setError(value instanceof Error ? value.message : "Daftar sesi tidak tersedia.");
    });
    return () => { active = false; };
  }, [onAccessExpired]);

  async function enter(action: "CREATE" | "RECOVER", id?: string) {
    if (action === "CREATE") await flushActive();
    const data = await studyRequest({ action, id, participantId, stationId, kind, sequence: Number(sequence), profileId }) as { study: PublicStudy; token: string };
    const credentials = { id: data.study.id, token: data.token };
    await new StudyTransport(credentials, () => undefined, () => undefined).flush();
    activateStudy(data.study, data.token);
    const locked = await fetch("/api/research/access", { method: "DELETE" });
    if (!locked.ok) throw new Error("Sesi tersimpan, tetapi pengaturan belum terkunci. Coba kunci pengaturan sebelum menyerahkan LMS ke peserta.");
    // Hand the LMS dashboard to the participant for normal course navigation.
    router.push("/dashboard");
  }
  async function download(id: string, format: string) {
    await flushActive(id);
    const response = await fetch("/api/research?id=" + id + "&format=" + format, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json(); if (response.status === 401) onAccessExpired(); throw new Error(data.error);
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = "study-" + id + "-" + format + (format === "json" ? ".json" : ".csv");
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function end(id: string) {
    await flushActive(id);
    await studyRequest({ action: "END", id });
    if (activeTransport?.credentials.id === id) await activeTransport.command("RESUME");
    await refresh();
  }

  return <div className="flex w-full min-w-0 flex-col gap-7">
    <header className="flex flex-col gap-3"><h1 className="text-3xl font-semibold">Ruang peneliti</h1>
      <p className="text-sm leading-7 text-muted-foreground">Lihat hasil tersimpan atau siapkan responden melalui tab pengaturan. Peserta tetap belajar melalui LMS.</p>
    </header>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Tabs defaultValue="results" className="min-w-0 gap-6">
      <TabsList aria-label="Menu peneliti"><TabsTrigger value="results">Dashboard hasil</TabsTrigger><TabsTrigger value="settings">Pengaturan & responden</TabsTrigger></TabsList>
      <TabsContent value="results" keepMounted className="min-w-0"><ResearchResultsDashboard onAccessExpired={onAccessExpired} /></TabsContent>
      <TabsContent value="settings" keepMounted className="flex min-w-0 flex-col gap-7">
    <AllocationEditor onAccessExpired={onAccessExpired} onSaved={() => void run(refresh)} />
    <section className="space-y-4 rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Status kesiapan</h2>
      <p className="text-sm">Metodologi: {overview?.readiness.methodology.status ?? METHODOLOGY.status} · CLT: {overview?.readiness.instrumentReady ? "disetujui" : overview?.readiness.instrumentComplete ? "draf lengkap untuk TEST/PILOT; MAIN menunggu persetujuan" : "teks belum lengkap"} · Profil MAIN: {overview?.readiness.mainProfile ?? "belum ditetapkan"}</p>
      <p className="text-sm">Alur sesi baru: pretest → belajar → posttest → CLT → kembali ke course. FER aktif otomatis saat belajar; tidak ada guidance peserta. Sesi lama tetap memakai alur yang tersimpan.</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6">{METHODOLOGY.pending.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
    <details><summary className="cursor-pointer text-sm font-medium">Sesi manual untuk peneliti (opsional)</summary>
    <form className="mt-4 flex flex-col gap-5 rounded-xl border p-5" onSubmit={(event) => { event.preventDefault(); setConfirmation({ action: "CREATE" }); }}>
      <h2 className="text-lg font-semibold">Siapkan peserta</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Kode peserta</span><input required pattern="[A-Za-z0-9_-]{1,40}" value={participantId} onChange={(event) => setParticipantId(event.target.value)} placeholder="P001" className={fieldClass} /></label>
        <label className="space-y-2 text-sm"><span>Kode PC</span><input required pattern="[A-Za-z0-9_-]{1,40}" value={stationId} onChange={(event) => setStationId(event.target.value)} placeholder="LAB01" className={fieldClass} /></label>
        <label className="space-y-2 text-sm"><span>Jenis sesi</span><select value={kind} onChange={(event) => setKind(event.target.value)} className={fieldClass}><option>TEST</option><option>PILOT</option><option>MAIN</option></select></label>
        <label className="space-y-2 text-sm"><span>Profil AUI kandidat</span><select value={profileId} disabled={kind === "MAIN"} onChange={(event) => setProfileId(event.target.value)} className={fieldClass}>{Object.keys(AUI_PROFILES).map((profile) => <option key={profile}>{profile}</option>)}</select></label>
      </div>
      <label className="block space-y-2 text-sm"><span>Urutan eksperimen</span>
        <select value={sequence} onChange={(event) => setSequence(event.target.value)} className={fieldClass}>
          <option value="1">1 · Sampling Adaptive → Correlation Non-Adaptive</option>
          <option value="2">2 · Sampling Non-Adaptive → Correlation Adaptive</option>
          <option value="3">3 · Correlation Adaptive → Sampling Non-Adaptive</option>
          <option value="4">4 · Correlation Non-Adaptive → Sampling Adaptive</option>
        </select>
      </label>
      <Button disabled={busy} type="submit">Buat sesi dan buka dashboard peserta</Button>
    </form>
    </details>
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Sesi tersimpan pada PC ini</h2><Button disabled={busy} variant="outline" size="sm" onClick={() => void run(refresh, { loading: "Memuat daftar sesi…", success: "Daftar sesi diperbarui" })}>Muat ulang daftar</Button></div>
      {overview?.sessions.length === 0 && <p className="text-sm">Belum ada sesi.</p>}
      {overview?.sessions.map((session) => <article key={session.id} className="space-y-4 rounded-xl border p-5">
        <p className="font-medium">{session.participantId} · {session.stationId} · {session.kind} · urutan {session.sequence}</p>
        <p className="break-all text-xs text-muted-foreground">{session.id} · {session.status} · {session.flowVersion === "POSTTEST_THEN_CLT" ? "Posttest sebelum CLT" : "Alur lama: CLT sebelum posttest"}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => enter("RECOVER", session.id), { loading: "Memulihkan sesi…", success: "Sesi berhasil dipulihkan" })}>Pulihkan / buka sesi</Button>
          {!["COMPLETED", "INCOMPLETE"].includes(session.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmation({ action: "END", id: session.id })}>Akhiri sebagai belum lengkap</Button>}
          {["json", "items", "blocks", "paired", "tests", "minutes", "aui-events"].map((format) => <Button key={format} size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => download(session.id, format), { loading: "Menyiapkan ekspor…", success: `Unduhan ${format.toUpperCase()} telah dimulai` })}>Ekspor {format.toUpperCase()}</Button>)}
        </div>
      </article>)}
    </section>
      </TabsContent>
    </Tabs>
    <ActionConfirmation open={confirmation !== null} onOpenChange={(open) => { if (!open) setConfirmation(null); }} busy={busy}
      title={confirmation?.action === "END" ? "Akhiri sesi ini?" : "Buat sesi penelitian?"}
      description={confirmation?.action === "END" ? "Sesi akan ditandai belum lengkap dan tidak dapat dilanjutkan oleh peserta. Jawaban yang sudah tersimpan tetap dipertahankan." : `Periksa kode peserta ${participantId}, kode PC ${stationId}, jenis ${kind}, dan urutan ${sequence} sebelum membuat sesi.`}
      confirmLabel={confirmation?.action === "END" ? "Ya, akhiri sesi" : "Ya, buat sesi"}
      onConfirm={() => {
        if (confirmation?.action === "END" && confirmation.id) void run(() => end(confirmation.id!), { loading: "Mengakhiri sesi…", success: "Sesi ditandai belum lengkap" });
        else if (confirmation?.action === "CREATE") void run(() => enter("CREATE"), { loading: "Membuat sesi…", success: "Sesi berhasil dibuat" });
      }} />
  </div>;
}

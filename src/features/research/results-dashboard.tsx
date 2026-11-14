"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { notifyAction } from "@/lib/action-feedback";
import { completePair, mean, type ResultsOverview, type ResultDetail, type ResultSession } from "./results-model";
import { ResultDetailView, formatNumber } from "./results-detail";
import type { StudyKind } from "./types";

const inputClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";
function conditionLabel(condition: string) { return condition === "ADAPTIVE" ? "Adaptive" : "Non-Adaptive"; }
function Metric({ title, value, description }: { title: string; value: string; description: string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl tabular-nums">{value}</CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-muted-foreground">{description}</p></CardContent></Card>;
}
export function ResearchResultsDashboard({ onAccessExpired }: { onAccessExpired: () => void }) {
  const [data, setData] = useState<ResultsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chosenKind, setChosenKind] = useState<StudyKind | null>(null);
  const [chosenCohort, setChosenCohort] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeSimulation, setIncludeSimulation] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/research/results", { cache: "no-store", signal });
    const next = await response.json();
    if (!response.ok) { if (response.status === 401) onAccessExpired(); throw new Error(next.error ?? "Hasil belum dapat dimuat."); }
    if (!signal?.aborted) { setData((previous) => previous && previous.fetchedAt > next.fetchedAt ? previous : next as ResultsOverview); setError(null); }
  }, [onAccessExpired]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try { if (document.visibilityState !== "hidden") await load(controller.signal); }
      catch (value) { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : "Hasil belum dapat dimuat."); }
      finally { if (!controller.signal.aborted) timer = setTimeout(() => void refresh(), 15000); }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [load]);
  const sessions = data?.sessions ?? [];
  const kind = chosenKind ?? (["MAIN", "PILOT", "TEST"] as const).find((value) => sessions.some((session) => session.kind === value)) ?? "MAIN";
  const cohorts = useMemo(() => {
    const seen = new Map<string, ResultSession>();
    for (const session of sessions) if (session.kind === kind && !seen.has(session.cohortId)) seen.set(session.cohortId, session);
    return [...seen.values()];
  }, [sessions, kind]);
  const cohortId = chosenCohort && cohorts.some((session) => session.cohortId === chosenCohort) ? chosenCohort : cohorts[0]?.cohortId ?? "";
  useEffect(() => {
    if (!data || !data.sessions.length) return;
    if (chosenKind === null) setChosenKind(kind);
    if (chosenCohort === null && cohortId) setChosenCohort(cohortId);
  }, [data, chosenKind, chosenCohort, kind, cohortId]);
  const cohortSessions = sessions.filter((session) => session.kind === kind && session.cohortId === cohortId);
  const counts = new Map<string, number>();
  for (const session of cohortSessions) counts.set(session.participantId, (counts.get(session.participantId) ?? 0) + 1);
  const duplicateCodes = new Set([...counts].filter(([, count]) => count > 1).map(([code]) => code));
  const filtered = cohortSessions.filter((session) => `${session.participantId} ${session.stationId}`.toLowerCase().includes(search.trim().toLowerCase()));
  const paired = filtered.filter((session) => !duplicateCodes.has(session.participantId) && completePair(session, includeSimulation));
  const conditions = ["ADAPTIVE", "NON_ADAPTIVE"] as const;
  const summaries = conditions.map((condition) => {
    const blocks = paired.map((session) => session.blocks.find((block) => block.condition === condition)!);
    return { condition, n: blocks.length,
      ICL: mean(blocks.map((block) => block.scores!.ICL)), ECL: mean(blocks.map((block) => block.scores!.ECL)), GCL: mean(blocks.map((block) => block.scores!.GCL)),
      pre: mean(blocks.flatMap((block) => block.pretest && block.pretest.total > 0 ? [block.pretest.correct / block.pretest.total * 100] : [])),
      post: mean(blocks.flatMap((block) => block.posttest && block.posttest.total > 0 ? [block.posttest.correct / block.posttest.total * 100] : [])),
    };
  });
  const difference = mean(paired.map((session) => session.blocks.find((block) => block.condition === "ADAPTIVE")!.scores!.ECL - session.blocks.find((block) => block.condition === "NON_ADAPTIVE")!.scores!.ECL));
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController(); setDetailError(null);
    void fetch(`/api/research/results?id=${encodeURIComponent(selectedId)}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const next = await response.json();
      if (!response.ok) { if (response.status === 401) onAccessExpired(); throw new Error(next.error ?? "Rincian belum dapat dimuat."); }
      if (!controller.signal.aborted) setDetail(next as ResultDetail);
    }).catch((value: unknown) => { if (!controller.signal.aborted) setDetailError(value instanceof Error ? value.message : "Rincian belum dapat dimuat."); });
    return () => controller.abort();
  }, [selectedId, data?.fetchedAt, onAccessExpired]);
  async function refreshManually() {
    if (refreshing) return; setRefreshing(true);
    try { await notifyAction(() => load(), { loading: "Membaca hasil tersimpan…", success: "Dashboard hasil diperbarui" }); }
    catch (value) { setError(value instanceof Error ? value.message : "Hasil belum dapat dimuat."); }
    finally { setRefreshing(false); }
  }
  function viewSession(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => {
      const panel = document.getElementById("research-result-detail");
      panel?.focus({ preventScroll: true }); panel?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  return <div className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">Dashboard hasil penelitian</h2><p className="max-w-3xl text-sm leading-6 text-muted-foreground">Angka dibaca langsung dari hasil yang sudah tersimpan pada PC ini. Data diperbarui setiap 15 detik saat tab terlihat. Perubahan yang masih mengantre pada browser belum masuk ringkasan.</p></div>
      <Button type="button" variant="outline" disabled={refreshing} onClick={() => void refreshManually()}><RefreshCw data-icon="inline-start" />{refreshing ? "Memuat…" : "Perbarui hasil"}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}{data ? " Data terakhir tetap ditampilkan." : ""}</p>}
    {!data && !error && <p role="status">Membaca hasil tersimpan…</p>}
    <div className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2 xl:grid-cols-[10rem_minmax(0,1fr)_16rem]">
      <label className="flex flex-col gap-2 text-sm"><span>Jenis sesi</span><select className={inputClass} value={kind} onChange={(event) => { setChosenKind(event.target.value as StudyKind); setChosenCohort(null); setSelectedId(null); setIncludeSimulation(false); }}>{["MAIN", "PILOT", "TEST"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="flex min-w-0 flex-col gap-2 text-sm"><span>Versi penelitian yang dibandingkan</span><select className={inputClass} value={cohortId} onChange={(event) => { setChosenCohort(event.target.value); setSelectedId(null); }}>{!cohorts.length && <option value="">Belum ada versi</option>}{cohorts.map((session) => <option key={session.cohortId} value={session.cohortId}>{session.appVersion} · {session.materialVersion} · CLT {session.instrumentVersion} · {session.profileId} · {session.cohortId.slice(0, 8)}</option>)}</select></label>
      <label className="flex flex-col gap-2 text-sm"><span>Cari peserta / PC</span><input className={inputClass} value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(null); }} placeholder="Kode peserta atau PC" /></label>
      {kind === "TEST" && <label className="flex items-center gap-2 text-sm md:col-span-2 xl:col-span-3"><input type="checkbox" checked={includeSimulation} onChange={(event) => setIncludeSimulation(event.target.checked)} />Sertakan jawaban CLT berlabel SIMULATION pada ringkasan TEST</label>}
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{kind}</Badge><span>Ringkasan memakai satu kombinasi materi, soal, instrumen, alur, aplikasi, dan konfigurasi AUI.</span><span>Terakhir dibaca: {data ? new Date(data.fetchedAt).toLocaleString("id-ID") : "—"}</span></div>
    {duplicateCodes.size > 0 && <p className="text-sm leading-6 text-muted-foreground">Ada {duplicateCodes.size} kode peserta dengan lebih dari satu sesi pada jenis dan versi ini. Semua sesi tetap terlihat; kode tersebut tidak dimasukkan ke ringkasan pasangan.</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Sesi tersimpan" value={data ? String(filtered.length) : "—"} description={`${new Set(filtered.map((session) => session.participantId)).size} kode peserta unik pada filter ini`} />
      <Metric title="Sesi selesai" value={data ? String(filtered.filter((session) => session.status === "COMPLETED").length) : "—"} description={`${filtered.filter((session) => !["COMPLETED", "INCOMPLETE"].includes(session.status)).length} berjalan · ${filtered.filter((session) => session.status === "INCOMPLETE").length} belum lengkap`} />
      <Metric title="Pasangan lengkap untuk ringkasan" value={data ? String(paired.length) : "—"} description="Kedua blok selesai dengan jawaban CLT final yang lengkap" />
      <Metric title="Selisih rata-rata ECL" value={formatNumber(difference)} description="Adaptive − Non-Adaptive, dihitung pada pasangan peserta yang sama" />
    </div>
    <Card><CardHeader><CardTitle>Perbandingan dua kondisi</CardTitle><CardDescription>ECL adalah hasil utama; ICL dan GCL ditampilkan terpisah. Hanya pasangan lengkap dalam filter yang masuk rata-rata.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">
      <div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-left text-sm"><caption className="sr-only">Rata-rata CLT dan hasil tes pada pasangan lengkap</caption><thead><tr className="border-b">{["Kondisi", "n pasangan", "ICL / 9", "ECL / 9", "GCL / 9", "Pretest %", "Posttest %"].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{summaries.map((row) => <tr key={row.condition} className="border-b last:border-0"><th scope="row" className="px-3 py-4 font-medium">{conditionLabel(row.condition)}</th><td className="px-3 py-4 tabular-nums">{row.n}</td>{[row.ICL, row.ECL, row.GCL, row.pre, row.post].map((value, i) => <td key={i} className="px-3 py-4 tabular-nums">{formatNumber(value)}</td>)}</tr>)}</tbody></table></div>
      <div className="grid gap-4 md:grid-cols-2">{summaries.map((row) => <div key={row.condition} className="flex flex-col gap-2"><div className="flex justify-between gap-3 text-sm"><span>ECL · {conditionLabel(row.condition)}</span><span className="tabular-nums">{formatNumber(row.ECL)} / 9</span></div><div role="img" aria-label={`Rata-rata ECL ${conditionLabel(row.condition)}: ${formatNumber(row.ECL)} dari 9`} className="h-3 overflow-hidden rounded-full bg-muted">{row.ECL !== null && <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, row.ECL / 9 * 100))}%` }} />}</div></div>)}</div>
      <p className="text-xs leading-6 text-muted-foreground">Nilai negatif pada selisih berarti ECL Adaptive lebih rendah secara deskriptif pada pasangan ini. Dashboard tidak melakukan uji signifikansi. Tanda — berarti belum ada nilai; jawaban kosong tidak diubah menjadi nol.{!includeSimulation && " Pasangan dengan jawaban CLT SIMULATION tidak masuk rata-rata."}</p>
      {!paired.length && <p role="status" className="text-sm">Belum ada pasangan lengkap yang memenuhi filter. Jawaban yang sudah tersedia tetap dapat dilihat pada rincian sesi.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Hasil per peserta dan kondisi</CardTitle><CardDescription>Termasuk sesi berjalan dan belum lengkap. Rata-rata CLT hanya ditampilkan setelah jawaban final tersimpan.</CardDescription></CardHeader><CardContent>
      {!filtered.length ? (
        <p className="py-4 text-sm text-muted-foreground">Belum ada sesi yang cocok dengan filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left text-sm">
            <caption className="sr-only">Hasil tersimpan per sesi dan blok pembelajaran</caption>
            <thead>
              <tr className="border-b">
                {["Peserta / PC", "Status", "Blok / materi", "Kondisi", "ICL", "ECL", "GCL", "Pretest", "Posttest", "Sumber CLT", "Rincian"].map((label) => (
                  <th scope="col" key={label} className="px-3 py-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((session) =>
                session.blocks.map((block) => (
                  <tr key={session.id + ":" + block.id} className="border-b last:border-0">
                    <th scope="row" className="px-3 py-4 font-medium">
                      {session.participantId}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {session.stationId} · {session.id.slice(0, 8)}
                      </span>
                    </th>
                    <td className="px-3 py-4"><Badge variant="outline">{session.status}</Badge></td>
                    <td className="px-3 py-4">{block.order} · {block.materialTitle}</td>
                    <td className="px-3 py-4">{conditionLabel(block.condition)}</td>
                    {(["ICL", "ECL", "GCL"] as const).map((dimension) => (
                      <td key={dimension} className="px-3 py-4 tabular-nums">{formatNumber(block.scores?.[dimension])}</td>
                    ))}
                    <td className="px-3 py-4 tabular-nums">{block.pretest ? block.pretest.correct + "/" + block.pretest.total : "—"}</td>
                    <td className="px-3 py-4 tabular-nums">{block.posttest ? block.posttest.correct + "/" + block.posttest.total : "—"}</td>
                    <td className="px-3 py-4 text-xs">{block.responseSource ?? "Belum dikirim"}</td>
                    <td className="px-3 py-4">
                      <Button type="button" variant={selectedId === session.id ? "secondary" : "outline"} size="sm" onClick={() => viewSession(session.id)}>Lihat hasil</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
    {selectedId && filtered.some((session) => session.id === selectedId) && <div id="research-result-detail" tabIndex={-1} className="flex scroll-mt-28 flex-col gap-4 rounded-xl border p-5">
      <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Tutup rincian</Button></div>
      {detailError && <p role="alert" className="text-sm text-destructive">{detailError}</p>}
      {detail?.session.id === selectedId ? <ResultDetailView detail={detail} /> : !detailError && <p role="status">Membaca jawaban dan log tersimpan…</p>}
    </div>}
  </div>;
}

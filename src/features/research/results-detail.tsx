"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ResultDetail } from "./results-model";

export function formatNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
export function formatDuration(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : `${formatNumber(value / 60000)} menit`;
}
export function ResultDetailView({ detail }: { detail: ResultDetail }) {
  const { session } = detail;
  return <section aria-label="Rincian hasil peserta" className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-semibold">Rincian {session.participantId}</h3><Badge variant="outline">{session.stationId}</Badge><Badge variant="secondary">{session.kind}</Badge></div>
    <p className="break-all text-xs text-muted-foreground">ID sesi: {session.id} · {session.appVersion} · {session.materialVersion} · CLT {session.instrumentVersion}</p>
    <div className="grid items-start gap-5 xl:grid-cols-2">{session.blocks.map((block) => {
      const saved = detail.blocks.find((item) => item.id === block.id);
      return <Card key={block.id}>
        <CardHeader><CardTitle>{block.materialTitle}</CardTitle><CardDescription>Blok {block.order} · {block.condition} · {block.completedAt ? "Selesai" : "Belum selesai"}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid grid-cols-3 gap-3">{(["ICL", "ECL", "GCL"] as const).map((dimension) => <div key={dimension} className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">{dimension}{dimension === "ECL" ? " · utama" : ""}</dt><dd className="text-2xl font-semibold tabular-nums">{formatNumber(block.scores?.[dimension])}<span className="text-xs font-normal text-muted-foreground"> / 9</span></dd></div>)}</dl>
          <p className="text-sm">Pretest: {block.pretest ? `${block.pretest.correct}/${block.pretest.total}` : "—"} · Posttest: {block.posttest ? `${block.posttest.correct}/${block.posttest.total}` : "—"}</p>
          <p className="text-xs leading-6 text-muted-foreground">Durasi pengisian CLT: {formatDuration(block.cltDurationMs)}<br />Dikirim: {block.cltSubmittedAt ? new Date(block.cltSubmittedAt).toLocaleString("id-ID") : "Belum dikirim"}<br />Sumber jawaban: {block.responseSource ?? "Belum ada jawaban final"}</p>
          <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Jawaban final per butir</summary>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Jawaban CLT blok {block.order}</caption><thead><tr className="border-b"><th scope="col" className="py-2 pr-3">Butir</th><th scope="col" className="py-2 pr-3">Pernyataan</th><th scope="col" className="py-2 text-right">Nilai</th></tr></thead><tbody>{saved?.items.map((item) => <tr key={item.id} className="border-b last:border-0"><th scope="row" className="py-3 pr-3 align-top font-medium">{item.id}</th><td className="py-3 pr-3 leading-6">{item.text ?? "Redaksi belum tersedia pada versi ini"}</td><td className="py-3 text-right align-top tabular-nums">{formatNumber(item.answer)}</td></tr>)}</tbody></table></div>
          </details>
          <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Log FER dan paparan AUI</summary>
            <div className="mt-4 flex flex-col gap-5">{saved?.stats.map((stats) => <div key={stats.source} className="flex flex-col gap-2 text-sm">
              <p className="font-medium">Sumber {stats.source}</p>
              <p>Sampel FER tercatat: {stats.samples} · Tanpa wajah: {stats.noFace} · Prediksi tidak valid: {stats.invalid}</p>
              <dl className="grid grid-cols-3 gap-3">{(["DEFAULT", "FOCUS", "ASSISTED"] as const).map((mode) => <div key={mode}><dt className="text-xs text-muted-foreground">{mode}</dt><dd className="mt-1 tabular-nums">{stats.minutes ? formatDuration(stats.modeMs[mode]) : "—"}</dd></div>)}</dl>
              <p className="leading-6">Transisi mode: {stats.modeChanges} · Tawaran: {stats.offered} · Diterima: {stats.accepted} · Ditolak: {stats.dismissed} · Manual override: {stats.manualOverrides}</p>
              <p className="leading-6">Trigger FER: {stats.triggers} · Pilihan Fokus: {stats.focusChosen} · Pilihan Bantuan: {stats.assistedChosen} · Ditutup: {stats.closed} · Diabaikan: {stats.ignored}</p>
              {!stats.minutes && <p className="text-xs text-muted-foreground">Belum ada ringkasan durasi untuk sumber ini.</p>}
            </div>)}</div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">Durasi berasal dari log yang sudah tersimpan, termasuk ringkasan parsial. Ini waktu mode saat tab terlihat; bukan ukuran cognitive load atau waktu memperhatikan bantuan.</p>
          </details>
        </CardContent>
      </Card>;
    })}</div>
  </section>;
}

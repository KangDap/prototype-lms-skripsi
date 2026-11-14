"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionConfirmation } from "@/components/action-confirmation";
import { notifyAction } from "@/lib/action-feedback";
import { AdaptiveControls, AssistanceOffer } from "../aui/adaptive-controls";
import { AUIDebugPanel } from "../aui/aui-debug-panel";
import { useAdaptiveUI } from "../aui/adaptive-provider";
import { useFERPrediction } from "../fer/fer-provider";
import type { AdaptiveUIMode, InputSource } from "../aui/types";
import type { PublicStudy, StudyEvent } from "./types";
import type { StudyTransport } from "./transport";
import { MaterialView } from "./material-view";
import { useResearchSession } from "./session-provider";
import type { ReadingInteraction } from "./contextual-help";

type Bucket = { startedAt: number; samples: number; valid: number; noFace: number; invalid: number; errors: number; hiddenMs: number; emotions: Record<string, number>; modeChanges: number; modeMs: Record<AdaptiveUIMode, number> };
function bucket(startedAt: number): Bucket { return { startedAt, samples: 0, valid: 0, noFace: 0, invalid: 0, errors: 0, hiddenMs: 0, emotions: {}, modeChanges: 0, modeMs: { DEFAULT: 0, FOCUS: 0, ASSISTED: 0 } }; }

export function ResearchLearning({ study, transport, onDone, onError }: { study: PublicStudy; transport: StudyTransport; onDone: () => void; onError: (error: unknown) => void }) {
  const { session, snapshot, debugAllowed } = useAdaptiveUI();
  const { session: fer } = useFERPrediction();
  const { registerCheckpoint } = useResearchSession();
  const block = study.blocks[study.currentBlock];
  const material = study.materials.find((item) => item.id === block.materialId)!;
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const episodeId = useRef("");
  const cursor = useRef(new Map<string, number>());
  const ending = useRef(false);
  const captureQueue = useRef<Promise<void>>(Promise.resolve());
  const summary = useRef<Bucket | null>(null);
  const summaryClock = useRef(0);
  const mode = useRef<AdaptiveUIMode>("DEFAULT");
  const source = useRef<InputSource>("REAL");
  const visible = useRef(true);
  const event = useCallback((type: string, payload: Record<string, unknown>, timestamp = new Date().toISOString()): StudyEvent => ({
    id: crypto.randomUUID(), blockId: block.id, episodeId: episodeId.current || (episodeId.current = crypto.randomUUID()), timestamp, type, payload,
  }), [block.id]);
  const logReading = useCallback<ReadingInteraction>((type, target, details = {}) => {
    const state = session.getSnapshot();
    void transport.events([event(type, { ...details, target, sectionId: target, mode: state.engine.mode, source: state.source })]).catch(onError);
  }, [session, transport, event, onError]);
  const advanceSummary = useCallback((time: number, output: StudyEvent[], partial = false) => {
    if (!summary.current) return;
    const advanceTo = Math.max(time, summaryClock.current);
    while (summaryClock.current < advanceTo) {
      const end = Math.min(advanceTo, summary.current.startedAt + 60000);
      if (visible.current) summary.current.modeMs[mode.current] += end - summaryClock.current;
      else summary.current.hiddenMs += end - summaryClock.current;
      summaryClock.current = end;
      if (end >= summary.current.startedAt + 60000) {
        output.push(event("MINUTE_SUMMARY", { ...summary.current, durationMs: 60000, partial: false, loggingOnly: true, source: source.current, rateHz: summary.current.samples / 60 }, new Date(end).toISOString()));
        summary.current = bucket(end);
      }
    }
    if (partial && advanceTo > summary.current.startedAt) {
      output.push(event("MINUTE_SUMMARY", { ...summary.current, durationMs: advanceTo - summary.current.startedAt, partial: true, loggingOnly: true, source: source.current, rateHz: summary.current.samples / ((advanceTo - summary.current.startedAt) / 1000) }, new Date(advanceTo).toISOString()));
      summary.current = bucket(advanceTo);
    }
  }, [event]);
  const capture = useCallback((final = false) => {
    const work = async () => {
      const output: StudyEvent[] = [];
      const updates: [string, number][] = [];
      for (const log of session.exportLogs()) {
        const last = cursor.current.get(log.sessionId) ?? 0;
        if (last === 0) output.push(event("ADAPTIVE_EPISODE_METADATA", { adaptiveSessionId: log.sessionId, source: log.source, config: log.config, monotonicOriginMs: log.monotonicOriginMs, startedAt: log.startedAt }));
        for (const raw of log.events.filter((item) => item.sequence > last)) {
          if (source.current !== log.source) { advanceSummary(Date.parse(raw.timestamp), output, true); source.current = log.source; }
          output.push(event(raw.type, { ...raw, adaptiveSessionId: log.sessionId }, raw.timestamp));
          {
            advanceSummary(Date.parse(raw.timestamp), output);
            const current = summary.current!;
            if (raw.type === "SESSION_STARTED") mode.current = raw.mode;
            if (raw.type === "UI_MODE_CHANGED") { current.modeChanges++; mode.current = raw.mode; }
            if (raw.type === "FER_STATUS_CHANGED" && raw.predictionStatus === "error") current.errors++;
            if (raw.type === "FER_PREDICTION") {
              current.samples++;
              if (raw.emotion) current.emotions[raw.emotion] = (current.emotions[raw.emotion] ?? 0) + 1;
              if (raw.predictionStatus === "no_face") current.noFace++;
              if (raw.predictionStatus === "invalid_prediction") current.invalid++;
              if (raw.predictionStatus === "error") current.errors++;
              if (raw.predictionStatus === "ok" && raw.confidence != null && raw.confidence >= session.config.confidenceThreshold) current.valid++;
            }
          }
        }
        updates.push([log.sessionId, log.events.at(-1)?.sequence ?? last]);
        if (final) output.push(event("LOG_INTEGRITY", { adaptiveSessionId: log.sessionId, source: log.source, retainedEvents: log.retainedEvents, droppedEvents: log.droppedEvents }));
      }
      advanceSummary(Date.now(), output, final);
      if (output.length) await transport.events(output);
      updates.forEach(([id, sequence]) => cursor.current.set(id, sequence));
    };
    const task = captureQueue.current.then(work);
    captureQueue.current = task.catch((error) => { onError(error); });
    return task;
  }, [session, transport, event, advanceSummary, onError]);

  useEffect(() => {
    started.current = Date.now(); if (!episodeId.current) episodeId.current = crypto.randomUUID();
    summary.current = bucket(started.current); summaryClock.current = started.current;
    visible.current = document.visibilityState !== "hidden"; source.current = "REAL";
    cursor.current = new Map(); ending.current = false;
    const initial = event("LEARNING_EPISODE_STARTED", { source: "REAL", freshFERWindow: true });
    const unregister = registerCheckpoint(async () => {
      ending.current = true; fer.stop(); session.end(performance.now(), "Peserta keluar dari LMS; simpan akhir episode.");
      await capture(true);
    });
    void transport.events([initial]).catch(onError);
    const timer = setInterval(() => { setElapsed(Math.floor((Date.now() - started.current) / 1000)); if (!ending.current) void capture().then(() => transport.flush()).catch(onError); }, 2000);
    const hide = () => {
      const isVisible = document.visibilityState !== "hidden";
      void capture(true).then(() => {
        visible.current = isVisible;
        return transport.events([event(isVisible ? "LEARNING_VISIBLE" : "LEARNING_INTERRUPTED", { reason: isVisible ? "TAB_VISIBLE" : "TAB_HIDDEN" })]);
      }).catch(onError);
    };
    document.addEventListener("visibilitychange", hide);
    const pageHide = () => { void capture(true).then(() => transport.flush()).catch(onError); };
    window.addEventListener("pagehide", pageHide);
    return () => {
      clearInterval(timer); document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", pageHide);
      unregister();
      if (!ending.current) void capture(true).then(() => transport.events([event("LEARNING_INTERRUPTED", { reason: "MATERIAL_ROUTE_LEFT", source: source.current })])).then(() => transport.flush()).catch(onError);
    };
  }, [transport, event, capture, onError, registerCheckpoint, fer, session]);

  async function finish() {
    if (busy || ending.current) return; setBusy(true); ending.current = true;
    try {
      await notifyAction(async () => {
        fer.stop(); session.end(performance.now(), "Blok belajar selesai; beralih ke evaluasi pemahaman.");
        await capture(true); await transport.command("END_LEARNING", { blockId: block.id });
      }, { loading: "Menyimpan sesi belajar…", success: "Sesi belajar berhasil disimpan", error: "Sesi belajar belum berhasil disimpan" });
      onDone();
    } catch (error) { onError(error); ending.current = false; setBusy(false); }
  }
  return <div data-aui-mode={snapshot.engine.mode} data-aui-phase={snapshot.engine.phase} className="adaptive-material flex w-full min-w-0 flex-col gap-6">
    <header className="space-y-3"><p hidden={snapshot.engine.mode !== "DEFAULT"} className="text-sm text-muted-foreground">Materi {block.order} dari 2</p><h1 className="text-3xl font-semibold">{material.title}</h1><p hidden={snapshot.engine.mode !== "DEFAULT"} className="text-sm text-muted-foreground">Waktu pada halaman ini: {Math.floor(elapsed / 60)} menit {elapsed % 60} detik</p></header>
    {study.config.interactionPolicy !== "USER_APPROVED_V1" && <p role="status" className="rounded-lg border p-3 text-sm">Sesi ini memakai snapshot AUI lama. Buat sesi baru untuk mekanisme tawaran dan persetujuan pengguna terbaru.</p>}
    <AdaptiveControls /><AssistanceOffer />
    {study.kind === "TEST" && <div className="flex flex-col gap-3 text-sm">
      <p>Sesi TEST · {block.condition} · Profil {study.profileId}</p>
      {block.condition === "NON_ADAPTIVE" ? <p className="text-muted-foreground">Blok NON_ADAPTIVE mempertahankan tampilan normal. Pengujian trigger tersedia pada blok ADAPTIVE.</p>
        : !debugAllowed && <p className="text-muted-foreground">Panel simulasi memerlukan mode development. Jalankan <code>pnpm.cmd lab:dev</code> dan pastikan <code>AUI_RESEARCH_MODE=false</code>, lalu buka kembali sesi TEST ini.</p>}
      <AUIDebugPanel />
    </div>}
    <MaterialView material={material} mode={snapshot.engine.mode} readingKey={`${study.id}:${block.id}`}
      onCloseAssistance={() => session.manual("RETURN_DEFAULT", performance.now())} onInteraction={logReading} />
    <div className="border-t pt-6"><Button disabled={busy} onClick={() => setConfirmFinish(true)}>{busy ? "Menyimpan akhir sesi belajar…" : "Selesai belajar"}</Button></div>
    <ActionConfirmation open={confirmFinish} onOpenChange={setConfirmFinish} busy={busy} title="Selesaikan pembelajaran?" description="Pastikan Anda sudah selesai mempelajari materi. Sesi belajar akan disimpan dan dilanjutkan ke evaluasi." confirmLabel="Ya, selesai belajar" onConfirm={() => void finish()} />
  </div>;
}

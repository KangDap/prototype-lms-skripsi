"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFERPrediction } from "./fer-provider";

const statusLabels = { inactive: "Nonaktif", starting: "Menghubungkan", active: "Aktif", error: "Error" };

export function FERControls() {
  const { status, sample, error, start, stop } = useFERPrediction();
  const [debugVisible, setDebugVisible] = useState(false);
  const running = status === "active" || status === "starting";
  const prediction = sample?.prediction;

  return (
    <section aria-label="Pengenalan ekspresi wajah" className="flex max-w-3xl flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm font-medium" role="status">FER: {statusLabels[status]}</span>
        <Button type="button" variant={running ? "outline" : "default"} onClick={running ? stop : start}>
          {status === "starting" ? "Batalkan" : running ? "Hentikan FER" : "Aktifkan FER"}
        </Button>
        <Button type="button" variant="ghost" aria-expanded={debugVisible} aria-controls="fer-debug" onClick={() => setDebugVisible((visible) => !visible)}>
          {debugVisible ? "Sembunyikan debug" : "Tampilkan debug"}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Dengan mengaktifkan FER, Anda mengizinkan frame kamera dikirim ke service FER lokal untuk analisis ekspresi wajah.
        Frame tidak disimpan. Kamera berhenti saat FER dinonaktifkan, tab disembunyikan, atau Anda meninggalkan materi.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error} Materi tetap dapat digunakan.</p>}
      {debugVisible && (
        <div id="fer-debug" className="border-t pt-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 tabular-nums">
            <dt>FER Status</dt><dd>{statusLabels[status]}</dd>
            <dt>Face Detection</dt><dd>{!prediction ? "Belum ada hasil" : prediction.face_detected ? `Detected (${prediction.face_count})` : "No face"}</dd>
            <dt>Emotion</dt><dd>{prediction?.emotion ?? (prediction?.status === "invalid_prediction" ? "Prediksi tidak valid" : "—")}</dd>
            <dt>Confidence</dt><dd>{prediction?.confidence != null ? `${prediction.confidence.toFixed(4)} (${(prediction.confidence * 100).toFixed(1)}%)` : "—"}</dd>
            <dt>Latency service</dt><dd>{prediction ? `${prediction.latency_ms.toFixed(0)} ms` : "—"}</dd>
            <dt>Timestamp (UTC)</dt><dd className="break-all">{prediction?.timestamp ?? "—"}</dd>
            <dt>Model / detector</dt><dd className="break-all">{prediction ? `${prediction.model} / ${prediction.detector}` : "—"}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Confidence adalah probabilitas model, bukan pengukuran cognitive load atau kebingungan. Jika beberapa wajah terdeteksi, hanya wajah terbesar diproses.</p>
        </div>
      )}
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useFERPrediction } from "./fer-provider";
import type { FERSnapshot } from "./types";

export function faceStatus(snapshot: FERSnapshot, now: number) {
  if (snapshot.status === "error") return { label: "Kamera bermasalah", detail: "Kamera atau layanan tidak tersedia.", color: "bg-amber-500" };
  if (snapshot.status === "inactive") return { label: "Kamera nonaktif", detail: "Kamera aktif otomatis selama pembelajaran materi.", color: "bg-muted-foreground" };
  if (snapshot.status === "starting" || !snapshot.sample || now - Date.parse(snapshot.sample.receivedAt) > 5000)
    return { label: "Menunggu deteksi", detail: "Menunggu hasil terbaru untuk memeriksa posisi wajah.", color: "bg-amber-500" };
  if (!snapshot.sample.prediction.face_detected) return { label: "Wajah tidak terdeteksi", detail: "Sesuaikan posisi wajah dan pencahayaan.", color: "bg-amber-500" };
  if (snapshot.sample.prediction.face_count > 1) return { label: "Beberapa wajah terlihat", detail: "Pastikan hanya peserta berada di dalam bingkai kamera.", color: "bg-amber-500" };
  return { label: "Wajah terdeteksi", detail: "Wajah terlihat pada hasil deteksi terbaru.", color: "bg-emerald-600" };
}
export function FaceIndicator() {
  const snapshot = useFERPrediction();
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const state = faceStatus(snapshot, now);
  const prediction = snapshot.sample?.prediction;
  const age = snapshot.sample ? now - Date.parse(snapshot.sample.receivedAt) : Infinity;
  const captureAge = snapshot.sample ? now - Date.parse(snapshot.sample.capturedAt) : Infinity;
  const fresh = snapshot.status === "active" && Number.isFinite(age) && age >= 0 && age <= 5000 && Number.isFinite(captureAge) && captureAge >= 0 && captureAge <= 5000;
  const valid = fresh && prediction?.status === "ok" && prediction.face_detected && prediction.face_count === 1
    && prediction.emotion != null && prediction.confidence != null && Number.isFinite(prediction.confidence);
  const label = valid ? `Wajah terdeteksi: ${prediction.emotion}, ${Math.round(prediction.confidence! * 100)}%`
    : snapshot.status === "active" && !fresh ? "Menunggu deteksi"
    : fresh && prediction?.status === "invalid_prediction" ? "Prediksi tidak tersedia" : state.label;
  return <span role="status" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs" title="Label dan confidence merupakan perkiraan klasifikasi model.">
    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${state.color}`} />
    <span>{label}</span>
  </span>;
}

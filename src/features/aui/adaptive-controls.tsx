"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSidebar } from "@/components/ui/sidebar";
import { FERControls } from "../fer/fer-controls";
import { useFERPrediction } from "../fer/fer-provider";
import { useAdaptiveUI } from "./adaptive-provider";
import { AdaptationOffer } from "./adaptation-offer";

const modeLabels = { DEFAULT: "Normal", FOCUS: "Fokus", ASSISTED: "Bantuan belajar" };

function AutomaticCameraStatus() {
  const { status, error, start } = useFERPrediction();
  const { snapshot } = useAdaptiveUI();
  if (snapshot.source !== "REAL" || !snapshot.sessionOpen || status !== "error") return null;
  return <div role="alert" className="space-y-3 rounded-xl border p-4 text-sm"><p>{error} Periksa izin kamera browser.</p><Button type="button" variant="outline" size="sm" onClick={start}>Coba kamera lagi</Button></div>;
}

export function AdaptiveControls() {
  const { session, snapshot, exportLogs, exportMessage, researchManaged } = useAdaptiveUI();
  const { toggleSidebar } = useSidebar();
  const { engine } = snapshot;
  const adaptive = session.condition === "ADAPTIVE";
  return <section aria-label="Pengaturan sesi belajar" className="flex flex-col gap-3">
    {researchManaged ? <AutomaticCameraStatus /> : <FERControls disabled={!snapshot.sessionOpen || snapshot.source === "SIMULATION"} />}
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" aria-live="polite" className="mr-2 text-sm">Tampilan: <strong>{modeLabels[engine.mode]}</strong>{engine.phase === "RECOVERY" && session.config.interactionPolicy !== "USER_APPROVED_V1" && " · Memulihkan tampilan…"}</p>
      {adaptive && <>
        {session.config.interactionPolicy === "USER_APPROVED_V1" && <>
          <Button variant="outline" disabled={!snapshot.sessionOpen || !engine.enabled || engine.mode === "FOCUS"} onClick={() => { session.manual("SELECT_FOCUS", performance.now()); toast.add({ type: "info", title: "Tampilan fokus diaktifkan" }); }}>Bantu Saya Fokus</Button>
          <Button variant="outline" disabled={!snapshot.sessionOpen || !engine.enabled || engine.mode === "ASSISTED"} onClick={() => { session.manual("SELECT_ASSISTED", performance.now()); toast.add({ type: "info", title: "Bantuan materi ditampilkan" }); }}>Tampilkan Bantuan Materi</Button>
        </>}
        <Button variant="outline" disabled={!snapshot.sessionOpen} onClick={() => { session.manual(engine.enabled ? "DISABLE" : "ENABLE", performance.now()); toast.add({ type: "info", title: engine.enabled ? "Adaptasi dinonaktifkan" : "Adaptasi diaktifkan" }); }}>{engine.enabled ? "Nonaktifkan adaptasi" : "Aktifkan adaptasi"}</Button>
        <Button variant="ghost" disabled={!snapshot.sessionOpen} onClick={() => { session.manual("RETURN_DEFAULT", performance.now()); toast.add({ type: "info", title: "Kembali ke tampilan normal" }); }}>Kembali ke tampilan normal</Button>
      </>}
      {engine.mode !== "DEFAULT" && <Button variant="outline" onClick={toggleSidebar}>Tampilkan / tutup navigasi</Button>}
    </div>
    {adaptive && engine.mode !== "DEFAULT" && <p className="text-xs text-muted-foreground">Sistem mengurangi elemen sekunder pada tampilan. Anda dapat membuka navigasi atau kembali ke tampilan normal kapan saja.</p>}
    {!researchManaged && <details className="text-xs text-muted-foreground">
      <summary className="w-fit cursor-pointer py-1">Catatan sesi dan ekspor</summary>
      <p className="my-2 max-w-3xl leading-5">Sesi mencatat prediksi ekspresi jika FER diaktifkan, hasil agregasi, dan perubahan tampilan. Gambar dan video tidak dicatat. Log hanya tersedia selama halaman ini terbuka. Akhiri dan ekspor sebelum meninggalkan halaman; periksa berkas unduhan untuk pencatatan penelitian.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => exportLogs(false)}>Ekspor log sementara</Button>
        <Button variant="outline" size="sm" onClick={() => exportLogs(true)}>{snapshot.sessionOpen ? "Akhiri sesi dan ekspor log" : "Ekspor ulang log final"}</Button>
      </div>
      {exportMessage && <p role="status" className="mt-2">{exportMessage}</p>}
    </details>}
    {!snapshot.sessionOpen && snapshot.sessionId && <p role="status" className="text-sm text-muted-foreground">Sesi telah berakhir. Materi tetap dapat dibaca. Muat ulang halaman untuk sesi baru.</p>}
    {snapshot.droppedEvents > 0 && <p role="alert" className="text-sm text-destructive">Kapasitas log penuh. Ekspor memiliki event yang hilang dan perlu diperiksa sebelum analisis.</p>}
  </section>;
}

export function AssistanceOffer() {
  const { session, snapshot } = useAdaptiveUI();
  if (session.config.interactionPolicy === "USER_APPROVED_V1") return <AdaptationOffer />;
  if (!snapshot.engine.assistanceOffered) return null;
  return <section aria-label="Tawaran bantuan" className="flex flex-col gap-3 rounded-xl border p-4">
    <p role="status" className="text-sm">Buka bantuan untuk bagian yang sedang dibaca? Anda dapat memilih istilah terkait, contoh relevan, atau ringkasan.</p>
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => { session.manual("ACCEPT_ASSISTANCE", performance.now()); toast.add({ type: "info", title: "Bantuan ditampilkan" }); }}>Tampilkan bantuan</Button>
      <Button variant="ghost" onClick={() => { session.manual("DISMISS_ASSISTANCE", performance.now()); toast.add({ type: "info", title: "Tawaran bantuan ditutup" }); }}>Tidak sekarang</Button>
    </div>
  </section>;
}

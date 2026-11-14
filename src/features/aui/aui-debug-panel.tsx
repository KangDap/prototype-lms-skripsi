"use client";

import { Button } from "@/components/ui/button";
import { AUI_PROFILES } from "./config";
import { EMOTIONS } from "../fer/types";
import { useFERPrediction } from "../fer/fer-provider";
import { useAdaptiveUI } from "./adaptive-provider";
import type { SimulationLabel } from "./simulation";
import type { InputSource } from "./types";

export function AUIDebugPanel() {
  const { session, snapshot, debugAllowed, researchManaged, profileId, simulationLabel, simulationConfidence, setSimulation, switchSource, startSimulation, reset } = useAdaptiveUI();
  const fer = useFERPrediction();
  if (!debugAllowed) return null;
  const matches = (config: typeof session.config) => Object.entries(config).every(([key, value]) => session.config[key as keyof typeof config] === value);
  const profile = profileId ? `${profileId}${matches(AUI_PROFILES[profileId]) ? "" : " · snapshot lama/khusus"}`
    : Object.entries(AUI_PROFILES).find(([, config]) => matches(config))?.[0] ?? "Snapshot khusus/legacy";
  const window = snapshot.preview;
  const engine = snapshot.engine;
  const prediction = snapshot.rawPrediction;
  const cooldown = Math.max(0, Math.ceil((engine.cooldownUntil - snapshot.now) / 1000));
  return <details className="rounded-xl border border-dashed p-4 text-sm">
    <summary className="cursor-pointer font-medium">{researchManaged ? "Pengujian trigger AUI · TEST" : "Debug AUI · development"}</summary>
    <div className="mt-4 flex flex-col gap-4">
      <p>Pilih sumber <strong>Simulasi</strong>, prediksi <strong>Anger</strong>, confidence <strong>0,90</strong>, lalu tekan <strong>Mulai simulasi</strong>. Biarkan tab tetap terlihat selama sekitar {session.config.windowDurationMs / 1000 * session.config.requiredConsecutiveWindows} detik. {session.config.interactionPolicy === "USER_APPROVED_V1" ? "Dialog tawaran seharusnya muncul; mode baru aktif setelah dipilih pengguna." : "Snapshot lama: Focus aktif otomatis setelah aturan terpenuhi."} Cooldown dapat menunda tawaran.</p>
      <p className="text-xs text-muted-foreground">Rasio = sampel kategori / sampel valid. Unknown, no_face, dan confidence rendah dikeluarkan dari pembilang dan penyebut. Hitungan persistence dapat kembali 0 setelah transisi; periksa hasil agregasi final dan keputusan terakhir.</p>
      {!engine.enabled && <p className="text-destructive">Adaptasi sedang dinonaktifkan. Aktifkan adaptasi pada kontrol belajar atau reset sesi pengujian terlebih dahulu.</p>}
      <p className="text-xs text-muted-foreground">Simulasi menggunakan sesi dan log terpisah. Pergantian sumber menghentikan FER dan membuang window parsial.</p>
      <label className="flex flex-wrap items-center gap-2">Sumber prediksi
        <select aria-label="Sumber prediksi" className="rounded-md border bg-background p-2" value={snapshot.source} disabled={!snapshot.sessionOpen} onChange={(event) => switchSource(event.target.value as InputSource)}><option value="REAL">FER asli</option><option value="SIMULATION">Simulasi</option></select>
      </label>
      {snapshot.source === "SIMULATION" && <div className="flex flex-wrap items-center gap-3">
        <label>Prediksi simulasi <select aria-label="Prediksi simulasi" className="rounded-md border bg-background p-2" value={simulationLabel} onChange={(event) => setSimulation(event.target.value as SimulationLabel, simulationConfidence)}>
          {[...EMOTIONS, "no_face", "invalid_prediction", "error"].map((label) => <option key={label}>{label}</option>)}
        </select></label>
        <label>Confidence <input aria-label="Confidence simulasi" type="number" min="0.15" max="1" step="0.01" className="w-20 rounded-md border p-2" value={simulationConfidence} onChange={(event) => {
          const confidence = Number(event.target.value);
          if (Number.isFinite(confidence) && confidence >= 0.15 && confidence <= 1) setSimulation(simulationLabel, confidence);
        }} /></label>
        <Button variant="outline" disabled={!snapshot.sessionOpen} onClick={() => snapshot.inputActive ? session.stopInput(performance.now()) : startSimulation()}>{snapshot.inputActive ? "Hentikan simulasi" : "Mulai simulasi"}</Button>
      </div>}
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 gap-y-2 tabular-nums">
        <dt>Profil aktif (parameter snapshot)</dt><dd>{profile}</dd>
        <dt>Confidence threshold profil</dt><dd><strong>{session.config.confidenceThreshold.toFixed(2)} ({Math.round(session.config.confidenceThreshold * 100)}%)</strong></dd>
        <dt>Mekanisme adaptasi</dt><dd>{session.config.interactionPolicy ?? "STAGED_LEGACY"}</dd>
        <dt>Aturan window negatif</dt><dd>{session.config.negativeWindowPolicy === "OCCURRENCE_ACCUMULATION" ? "Akumulasi kejadian negatif per window" : "Dominasi negatif dan persistence"}</dd>
        <dt>Minimum prediksi negatif/window</dt><dd>{session.config.minNegativeSamples ?? "Tidak ditetapkan pada profil dominasi"}</dd>
        <dt>Tawaran / timeout / suppression</dt><dd>{engine.assistanceOffered ? "Terbuka" : "Tidak ada"} · {(session.config.offerTimeoutMs ?? 30000) / 1000}s · {(session.config.offerSuppressionMs ?? session.config.adaptationCooldownMs) / 1000}s</dd>
        <dt>Konfigurasi aktif</dt><dd>Window {session.config.windowDurationMs / 1000}s; sampling {session.config.samplingIntervalMs / 1000}s; minimum {session.config.minValidSamples} valid; confidence ≥ {session.config.confidenceThreshold}; rasio negatif/stable ≥ {session.config.negativeRatioThreshold}/{session.config.stableRatioThreshold}; persistence {session.config.requiredConsecutiveWindows}/{session.config.requiredStableWindows ?? session.config.requiredConsecutiveWindows}; cooldown {session.config.adaptationCooldownMs / 1000}s; recovery {session.config.recoveryDurationMs / 1000}s.</dd>
        <dt>FER Status</dt><dd>{snapshot.source === "REAL" ? fer.status : snapshot.inputActive ? "Simulasi aktif" : "Simulasi berhenti"}</dd>
        <dt>Experiment condition</dt><dd>{session.condition}</dd>
        <dt>Session ID</dt><dd className="break-all">{snapshot.sessionId ?? "—"}</dd>
        <dt>Raw Emotion</dt><dd>{prediction?.emotion ?? prediction?.status ?? "UNKNOWN"}</dd>
        <dt>Confidence prediksi terakhir</dt><dd>{prediction?.confidence?.toFixed(2) ?? "—"}</dd>
        <dt>Affective State (final)</dt><dd>{snapshot.lastWindow?.state ?? "UNKNOWN"}</dd>
        {snapshot.lastWindow?.status && <><dt>Status / alasan window terakhir</dt><dd>{snapshot.lastWindow.status}: {snapshot.lastWindow.reason}</dd></>}
        {snapshot.lastEligibility && <><dt>Eligibility tawaran terakhir</dt><dd>{snapshot.lastEligibility.eligible ? "Memenuhi" : "Tidak memenuhi"}: {snapshot.lastEligibility.reason}</dd></>}
        <dt>Window Progress</dt><dd>{window ? `${Math.max(0, Math.min(session.config.windowDurationMs, snapshot.now - window.startedAt) / 1000).toFixed(1)} / ${session.config.windowDurationMs / 1000} detik` : "Tidak berjalan"}</dd>
        <dt>Valid / total samples</dt><dd>{window ? `${window.validSamples} / ${window.totalSamples} (minimum ${session.config.minValidSamples})` : "—"}</dd>
        <dt>Sampel negatif / stable / ambiguous (berjalan)</dt><dd>{window ? `${window.negativeSamples} / ${window.stableSamples} / ${window.ambiguousSamples}` : "—"}</dd>
        <dt>Negative / stable ratio (berjalan)</dt><dd>{window ? `${(window.negativeRatio * 100).toFixed(0)}% / ${(window.stableRatio * 100).toFixed(0)}%` : "—"}</dd>
        <dt>Consecutive negative / stable windows</dt><dd>{engine.negativeWindows} / {engine.stableWindows} (perlu {session.config.requiredConsecutiveWindows} / {session.config.requiredStableWindows ?? session.config.requiredConsecutiveWindows})</dd>
        <dt>Current UI Mode</dt><dd>{engine.mode} · {engine.phase}</dd>
        <dt>Cooldown</dt><dd>{cooldown ? `${cooldown} detik` : "Tidak aktif"}</dd>
        <dt>Rule / keputusan terakhir</dt><dd>{engine.lastRule}: {engine.lastReason}</dd>
        <dt>Alasan adaptasi terakhir</dt><dd>{engine.lastAdaptationReason ?? "Belum ada"}</dd>
        <dt>Log events / dropped</dt><dd>{snapshot.eventCount} / {snapshot.droppedEvents}</dd>
      </dl>
      {snapshot.lastWindow && <details><summary className="cursor-pointer">Hasil agregasi final</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(snapshot.lastWindow, null, 2)}</pre></details>}
      <p className="text-xs text-muted-foreground">FER adalah sinyal afektif, bukan pengukur cognitive load atau diagnosis kebingungan. Parameter awal memerlukan pilot testing.</p>
      <Button className="w-fit" variant="outline" disabled={!snapshot.sessionOpen} onClick={reset}>Reset adaptive state dan mulai sesi baru</Button>
    </div>
  </details>;
}

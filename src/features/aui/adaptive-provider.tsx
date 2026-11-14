"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useFERPrediction } from "../fer/fer-provider";
import { useStudentLms } from "../lms/student-shell";
import { AdaptiveSession, type AdaptiveSnapshot } from "./adaptive-session";
import { getAdaptiveUIConfig, AUI_PROFILES, DEFAULT_PILOT_PROFILE, USER_APPROVED_CONFIG, type AUIProfileId } from "./config";
import { validateLogExport } from "./event-log";
import { createSyntheticPrediction, type SimulationLabel } from "./simulation";
import type { AggregationConfig, ExperimentCondition, InputSource } from "./types";

type AdaptiveContextValue = {
  session: AdaptiveSession;
  snapshot: AdaptiveSnapshot;
  debugAllowed: boolean;
  researchManaged: boolean;
  profileId: AUIProfileId | null;
  simulationLabel: SimulationLabel;
  simulationConfidence: number;
  setSimulation: (label: SimulationLabel, confidence: number) => void;
  switchSource: (source: InputSource) => void;
  startSimulation: () => void;
  reset: () => void;
  exportLogs: (end: boolean) => void;
  exportMessage: string | null;
};
const AdaptiveContext = createContext<AdaptiveContextValue | null>(null);
export function useAdaptiveUI() {
  const context = useContext(AdaptiveContext);
  if (!context) throw new Error("useAdaptiveUI requires AdaptiveProvider.");
  return context;
}

export function AdaptiveProvider({ courseId, materialId, condition, debugAllowed, children, aggregationConfig, researchManaged = false, profileId }: {
  courseId: string; materialId: string; condition: ExperimentCondition; debugAllowed: boolean; children: ReactNode;
  aggregationConfig?: Readonly<AggregationConfig>; researchManaged?: boolean; profileId?: AUIProfileId;
}) {
  const { session: fer, start: startFER } = useFERPrediction();
  const { applyAdaptiveConfig } = useStudentLms();
  const [session] = useState(() => new AdaptiveSession({ courseId, materialId, condition },
    aggregationConfig ?? { ...AUI_PROFILES[DEFAULT_PILOT_PROFILE], ...USER_APPROVED_CONFIG }));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  const [simulation, setSimulationState] = useState({ label: "Anger" as SimulationLabel, confidence: 0.82 });
  const simulationRef = useRef(simulation);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    session.open(performance.now());
    let token = -1;
    let wasActive = false;
    const onFERChange = () => {
      if (session.getSnapshot().source !== "REAL") return;
      const current = fer.getSnapshot();
      const now = performance.now();
      if (current.status === "active") {
        if (!wasActive) { token = session.startInput(now); wasActive = true; }
        const sample = current.sample;
        if (sample) session.ingest({ source: "REAL", streamId: sample.sessionId, sequence: sample.sequence,
          capturedAt: sample.capturedAtMonotonicMs, prediction: sample.prediction }, token, now);
      } else {
        if (wasActive || current.status === "error") session.stopInput(now, current.error ?? "FER dihentikan; window parsial dibuang.", current.status);
        wasActive = false;
      }
    };
    const unsubscribe = fer.subscribe(onFERChange);
    onFERChange();
    const timer = setInterval(() => session.tick(performance.now()), 250);
    const onHide = () => { if (document.visibilityState === "hidden") session.stopInput(performance.now(), "Tab disembunyikan; data lama dibuang."); };
    const onPageHide = () => session.end(performance.now(), "Halaman ditutup.");
    const onPageShow = (event: PageTransitionEvent) => {
      if (!researchManaged || !event.persisted) return;
      wasActive = false;
      session.open(performance.now());
      onFERChange();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      session.end(performance.now(), "Halaman materi ditinggalkan.");
    };
  }, [session, fer, researchManaged]);

  useEffect(() => {
    applyAdaptiveConfig(getAdaptiveUIConfig(snapshot.engine.mode));
  }, [snapshot.engine.mode, applyAdaptiveConfig]);
  useEffect(() => () => applyAdaptiveConfig(getAdaptiveUIConfig("DEFAULT")), [applyAdaptiveConfig]);

  useEffect(() => {
    if (!debugAllowed || snapshot.source !== "SIMULATION" || !snapshot.inputActive) return;
    const streamId = crypto.randomUUID();
    const token = session.getInputToken();
    let sequence = 0;
    const sample = () => {
      const now = performance.now();
      const { label, confidence } = simulationRef.current;
      session.ingest({ source: "SIMULATION", streamId, sequence: ++sequence, capturedAt: now,
        prediction: createSyntheticPrediction(label, confidence) }, token, now);
    };
    sample();
    const timer = setInterval(sample, session.config.samplingIntervalMs);
    return () => clearInterval(timer);
  }, [debugAllowed, snapshot.source, snapshot.inputActive, session]);

  function exportLogs(end: boolean) {
    if (end) {
      fer.stop();
      session.end(performance.now(), "Pengguna mengakhiri sesi dan mengekspor log.");
    }
    const sessions = session.exportLogs();
    const validation = sessions.map((log) => ({ sessionId: log.sessionId, issues: validateLogExport(log) }));
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), validation, sessions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aui-${snapshot.sessionId ?? "session"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const issues = validation.flatMap((item) => item.issues);
    setExportMessage(issues.length ? `Ekspor dibuat dengan catatan: ${[...new Set(issues)].join(" ")}` : "Log final diekspor; validasi struktur berhasil. Pastikan berkas unduhan tersimpan.");
  }

  return <AdaptiveContext.Provider value={{ session, snapshot, debugAllowed, researchManaged, profileId: profileId ?? (aggregationConfig ? null : DEFAULT_PILOT_PROFILE),
    simulationLabel: simulation.label, simulationConfidence: simulation.confidence, exportMessage, exportLogs,
    setSimulation: (label, confidence) => {
      const next = { label, confidence };
      simulationRef.current = next;
      setSimulationState(next);
    },
    switchSource: (source) => {
      if (!debugAllowed || !session.getSnapshot().sessionOpen) return;
      fer.stop();
      session.switchSource(source, performance.now());
      if (researchManaged && source === "REAL" && document.visibilityState !== "hidden") startFER();
    },
    startSimulation: () => { if (debugAllowed && session.getSnapshot().source === "SIMULATION") session.startInput(performance.now()); },
    reset: () => {
      if (!debugAllowed || !session.getSnapshot().sessionOpen) return;
      fer.stop();
      const now = performance.now();
      session.end(now, "Reset development; log lama dipertahankan terpisah.");
      session.open(now);
      if (researchManaged && session.getSnapshot().source === "REAL" && document.visibilityState !== "hidden") startFER();
    },
  }}>{children}</AdaptiveContext.Provider>;
}

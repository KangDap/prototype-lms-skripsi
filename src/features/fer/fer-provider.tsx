"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FERSession } from "./session";
import type { FERSnapshot } from "./types";

const FERContext = createContext<(FERSnapshot & { session: FERSession; allowed: boolean; start: () => void; stop: () => void }) | null>(null);

export function useFERPrediction() {
  const context = useContext(FERContext);
  if (!context) throw new Error("useFERPrediction requires FERProvider.");
  return context;
}

export function FERProvider({ courseId, materialId, children, preview = false, enabled = true, autoStart = false, samplingIntervalMs }: {
  courseId: string; materialId: string; children: ReactNode; preview?: boolean; enabled?: boolean; autoStart?: boolean; samplingIntervalMs?: number;
}) {
  const [session] = useState(() => new FERSession({ courseId, materialId }));
  const video = useRef<HTMLVideoElement>(null);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  useEffect(() => {
    session.setContext({ courseId, materialId });
    if (samplingIntervalMs !== undefined) session.setSamplingInterval(samplingIntervalMs);
    if (!enabled) session.stop();
    else if (autoStart && document.visibilityState !== "hidden" && video.current) void session.start(video.current);
  }, [session, courseId, materialId, enabled, autoStart, samplingIntervalMs]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") session.stop();
      else if (enabled && autoStart && video.current) void session.start(video.current);
    };
    window.addEventListener("pagehide", session.stop);
    window.addEventListener("pageshow", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", session.stop);
      window.removeEventListener("pageshow", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
      session.stop();
    };
  }, [session, enabled, autoStart]);

  return (
    <FERContext.Provider value={{ ...(enabled ? snapshot : { status: "inactive" as const, sample: null, error: null }), session, allowed: enabled, start: () => { if (enabled && video.current) { session.setContext({ courseId, materialId }); void session.start(video.current); } }, stop: session.stop }}>
      {/* Capture stays mounted when the debug panel is hidden. No audio or recording. */}
      <video ref={video} muted playsInline aria-hidden={!preview} aria-label={preview ? "Pratinjau posisi wajah" : undefined} className={preview ? "mb-4 aspect-video w-full max-w-md rounded-xl border bg-black object-cover" : "hidden"} />
      {children}
    </FERContext.Provider>
  );
}

/** Mirrors the capture stream; never opens a second camera or records video. */
export function FERPreview() {
  const { session, status } = useFERPrediction();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = status === "active" ? session.getMediaStream() : null;
    if (element.srcObject) void element.play().catch(() => undefined);
    return () => { element.pause(); element.srcObject = null; };
  }, [session, status]);
  return <video ref={video} muted playsInline aria-label="Pratinjau posisi wajah" className="aspect-video w-full max-w-md rounded-xl border bg-black object-cover" />;
}

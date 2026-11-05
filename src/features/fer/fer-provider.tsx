"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FERSession } from "./session";
import type { FERSnapshot } from "./types";

const FERContext = createContext<(FERSnapshot & { start: () => void; stop: () => void }) | null>(null);

export function useFERPrediction() {
  const context = useContext(FERContext);
  if (!context) throw new Error("useFERPrediction requires FERProvider.");
  return context;
}

export function FERProvider({ courseId, materialId, children }: {
  courseId: string; materialId: string; children: ReactNode;
}) {
  const [session] = useState(() => new FERSession({ courseId, materialId }));
  const video = useRef<HTMLVideoElement>(null);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") session.stop(); };
    window.addEventListener("pagehide", session.stop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", session.stop);
      document.removeEventListener("visibilitychange", onVisibility);
      session.stop();
    };
  }, [session]);

  return (
    <FERContext.Provider value={{ ...snapshot, start: () => { if (video.current) void session.start(video.current); }, stop: session.stop }}>
      {/* Capture stays mounted when the debug panel is hidden. No audio or recording. */}
      <video ref={video} muted playsInline aria-hidden="true" className="hidden" />
      {children}
    </FERContext.Provider>
  );
}

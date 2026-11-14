"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useResearchSession } from "./session-provider";
import { RESEARCH_SETTINGS_PATH } from "./routing";
import { Button } from "@/components/ui/button";
import { ParticipantProtocol } from "./participant-protocol";
export function ParticipantSessionGate({ children }: { children: ReactNode }) {
  const { study, loading, error, retry } = useResearchSession();
  const pathname = usePathname(); const router = useRouter();
  const settings = pathname === RESEARCH_SETTINGS_PATH || pathname === "/research";
  useEffect(() => { if (!settings && !loading && !study) router.replace("/"); }, [settings, loading, study, router]);
  if (settings) return <>{children}</>;
  if (loading) return <div className="space-y-4"><p>Memuat sesi…</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button variant="outline" onClick={() => void retry()}>Coba kembali</Button></div>;
  if (study?.protocolVersion && !study.protocolAcknowledgedAt) return <ParticipantProtocol requireAcknowledgement />;
  return study ? <>{children}</> : null;
}

"use client";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useResearchSession } from "./session-provider";
import { RESEARCH_SETTINGS_PATH } from "./routing";
/** Save feedback only; no material directions or procedural guidance. */
export function SessionSaveStatus() {
  const pathname = usePathname(); const { study, error, saveMessage, retry, now } = useResearchSession();
  if (pathname === RESEARCH_SETTINGS_PATH || pathname === "/research" || !study) return null;
  return <div className="space-y-3 border-t pt-4 text-xs text-muted-foreground">
    {saveMessage && <p role="status">{saveMessage}</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void retry()}>Coba simpan kembali</Button></div>}
    {now > 0 && !["COMPLETED", "INCOMPLETE"].includes(study.status) && now - Date.parse(study.createdAt) >= 3600000 && <p>Sesi telah mencapai 60 menit. Silakan hubungi peneliti.</p>}
  </div>;
}

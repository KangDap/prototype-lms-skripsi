"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { notifyAction } from "@/lib/action-feedback";
import { FERProvider } from "../fer/fer-provider";
import { StudyTransport, type StudyCredentials } from "./transport";
import type { Answers, PublicStudy } from "./types";
import type { CLTResponseSource } from "./clt";
import { ACTIVE_STUDY_KEY, ENTRY_ATTEMPT_KEY, materialPath, RESEARCH_COURSE_ID } from "./routing";

type SessionContext = {
  study: PublicStudy | null; loading: boolean; busy: boolean; now: number; error: string | null; saveMessage: string;
  transport: StudyTransport | null; allowDebug: boolean;
  activateStudy: (study: PublicStudy, token: string) => void;
  command: (action: string, input?: Record<string, unknown>) => Promise<boolean>;
  saveDraft: (answers: Answers, responseSource?: CLTResponseSource) => void; retry: () => Promise<void>; onError: (value: unknown) => void;
  leaveSession: () => Promise<boolean>; registerCheckpoint: (handler: () => Promise<void>) => () => void;
};
const Context = createContext<SessionContext | null>(null);
export function useResearchSession() {
  const value = useContext(Context); if (!value) throw new Error("ResearchSessionProvider diperlukan."); return value;
}

export function ResearchSessionProvider({ children, allowDebug = false }: { children: ReactNode; allowDebug?: boolean }) {
  const pathname = usePathname();
  const [credentials, setCredentials] = useState<StudyCredentials | null>(null);
  const [study, setStudy] = useState<PublicStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const activeCredentials = useRef<StudyCredentials | null>(null);
  const currentStudy = useRef<PublicStudy | null>(null);
  const draftCache = useRef(new Map<string, { answers: Answers; responseSource: CLTResponseSource }>());
  const commandActive = useRef(false);
  const checkpoints = useRef(new Set<() => Promise<void>>());
  const onError = useCallback((value: unknown) => setError(value instanceof Error ? value.message : "Penyimpanan gagal."), []);
  const onStudy = useCallback((next: PublicStudy) => {
    if (next.id !== activeCredentials.current?.id) return;
    if (currentStudy.current?.status !== next.status) { setBusy(false); setError(null); }
    const merged: PublicStudy = { ...next, blocks: next.blocks.map((block) => {
      const drafts = { ...block.drafts };
      let cltDraftSource = block.cltDraftSource;
      for (const phase of ["PRETEST", "POSTTEST", "CLT"] as const) {
        const cached = draftCache.current.get(`${block.id}:${phase}`);
        const submitted = phase === "PRETEST" ? block.pretest : phase === "POSTTEST" ? block.posttest : block.clt || block.cltSkippedForTest;
        if (cached && !submitted) { drafts[phase] = cached.answers; if (phase === "CLT") cltDraftSource = cached.responseSource; }
      }
      return { ...block, drafts, cltDraftSource };
    }) };
    currentStudy.current = merged; setStudy(merged);
  }, []);
  const transport = useMemo(() => credentials ? new StudyTransport(credentials,
    (next) => { if (activeCredentials.current?.token === credentials.token) onStudy(next); },
    (message) => { if (activeCredentials.current?.token === credentials.token) setSaveMessage(message); },
  ) : null, [credentials, onStudy]);

  const activateStudy = useCallback((next: PublicStudy, token: string) => {
    const access = { id: next.id, token };
    sessionStorage.setItem(ACTIVE_STUDY_KEY, JSON.stringify(access));
    draftCache.current.clear(); activeCredentials.current = access; currentStudy.current = next;
    setStudy(next); setCredentials(access); setLoading(true); setBusy(false); setError(null);
  }, []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ACTIVE_STUDY_KEY);
      if (raw) { const access = JSON.parse(raw) as StudyCredentials; activeCredentials.current = access; setCredentials(access); }
      else setLoading(false);
    } catch { setLoading(false); onError("Informasi sesi pada browser tidak dapat dibaca. Pulihkan melalui pengaturan."); }
  }, [onError]);
  useEffect(() => {
    if (!transport) return;
    let mounted = true;
    const restore = async () => {
      try { await transport.flush(); await transport.command("RESUME"); if (mounted) setLoading(false); }
      catch (value) { if (mounted) onError(value); }
    };
    void restore();
    const timer = setInterval(() => { setNow(Date.now()); void transport.flush().catch((value: unknown) => { if (mounted) onError(value); }); }, 2000);
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (currentStudy.current && !["COMPLETED", "INCOMPLETE"].includes(currentStudy.current.status)) event.preventDefault();
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener("beforeunload", preventLoss); };
  }, [transport, onError]);

  const command = useCallback(async (action: string, input: Record<string, unknown> = {}) => {
    if (!transport || commandActive.current) return false;
    commandActive.current = true; setBusy(true); setError(null);
    try {
      const work = () => transport.command(action, input);
      if (action === "SUBMIT") {
        const label = input.phase === "CLT" ? "kuesioner" : input.phase === "PRETEST" ? "pretest" : "posttest";
        await notifyAction(work, { loading: `Menyimpan jawaban ${label}…`, success: `Jawaban ${label} berhasil disimpan`, error: "Jawaban belum berhasil dikirim" });
      } else if (action === "ACK_PROTOCOL") await notifyAction(work, { loading: "Menyimpan konfirmasi panduan…", success: "Panduan dikonfirmasi. Silakan mulai pembelajaran." });
      else if (action === "SKIP_DRAFT_CLT") await notifyAction(work, { loading: "Melewati kuesioner kosong…", success: "Kuesioner kosong dilewati untuk TEST" });
      else await work();
      setBusy(false); return true;
    }
    catch (value) { onError(value); if (action !== "SUBMIT") setBusy(false); return false; }
    finally { commandActive.current = false; }
  }, [transport, onError]);
  const saveDraft = useCallback((answers: Answers, responseSource: CLTResponseSource = "PARTICIPANT") => {
    const active = currentStudy.current;
    if (!active || !transport || !["PRETEST", "POSTTEST", "CLT"].includes(active.status)) return;
    const block = active.blocks[active.currentBlock];
    const source = active.status === "CLT" && block.cltDraftSource === "SIMULATION" ? "SIMULATION" : responseSource;
    draftCache.current.set(`${block.id}:${active.status}`, { answers, responseSource: source });
    onStudy(active);
    void transport.enqueue("DRAFT", { answers, phase: active.status, blockId: block.id, ...(active.status === "CLT" ? { responseSource: source } : {}) }).catch(onError);
  }, [transport, onStudy, onError]);
  const retry = useCallback(async () => {
    if (!transport) return; setError(null);
    try { await notifyAction(async () => { await transport.flush(); if (loading) await transport.command("RESUME"); }, { loading: "Mencoba menyimpan kembali…", success: "Seluruh perubahan berhasil disimpan" }); setLoading(false); setBusy(false); }
    catch (value) { onError(value); }
  }, [transport, loading, onError]);
  const registerCheckpoint = useCallback((handler: () => Promise<void>) => {
    checkpoints.current.add(handler);
    return () => { checkpoints.current.delete(handler); };
  }, []);
  const leaveSession = useCallback(async () => {
    try {
      await notifyAction(async () => {
        for (const checkpoint of checkpoints.current) await checkpoint();
        if (transport) await transport.flush();
        sessionStorage.removeItem(ACTIVE_STUDY_KEY); sessionStorage.removeItem(ENTRY_ATTEMPT_KEY);
        activeCredentials.current = null; currentStudy.current = null; draftCache.current.clear();
        setCredentials(null); setStudy(null); setLoading(false); setBusy(false); setSaveMessage(""); setError(null);
      }, { loading: "Menyimpan perubahan sebelum keluar…", success: "Berhasil keluar; perubahan telah disimpan" });
      return true;
    } catch (value) { onError(value); return false; }
  }, [transport, onError]);

  const block = study?.blocks[study.currentBlock];
  const cameraEnabled = !loading && Boolean(block && pathname === materialPath(block.materialId) && study?.status === "LEARNING" && (!study.protocolVersion || study.protocolAcknowledgedAt));
  return <Context.Provider value={{ study, loading, busy, now, error, saveMessage, transport, allowDebug, activateStudy, command, saveDraft, retry, onError, leaveSession, registerCheckpoint }}>
    <FERProvider courseId={RESEARCH_COURSE_ID} materialId={block?.materialId ?? ""} enabled={cameraEnabled} autoStart={cameraEnabled} samplingIntervalMs={study?.config.samplingIntervalMs}>
      {children}
    </FERProvider>
  </Context.Provider>;
}

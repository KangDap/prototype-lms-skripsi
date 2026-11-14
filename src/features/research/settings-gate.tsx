"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { notifyAction } from "@/lib/action-feedback";
import { ResearchOperator } from "./operator";

export function ResearchSettingsGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const opened = useRef(false);
  const accessExpired = useCallback(() => { opened.current = false; setUnlocked(false); }, []);
  useEffect(() => {
    let active = true;
    const leave = () => {
      if (!opened.current) return;
      opened.current = false; setUnlocked(false);
      void fetch("/api/research/access", { method: "DELETE", keepalive: true }).catch(() => undefined);
    };
    window.addEventListener("pagehide", leave);
    void fetch("/api/research/access", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Status akses tidak dapat dimuat.");
      const data = await response.json(); if (active) setConfigured(data.configured);
    }).catch((value: unknown) => { if (active) setError(value instanceof Error ? value.message : "Status akses tidak tersedia."); }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      window.removeEventListener("pagehide", leave);
      if (opened.current) void fetch("/api/research/access", { method: "DELETE", keepalive: true }).catch(() => undefined);
    };
  }, []);
  async function unlock() {
    if (busy) return; setBusy(true); setError(null);
    try {
      await notifyAction(async () => {
        const response = await fetch("/api/research/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        setPassword(""); opened.current = true; setUnlocked(true);
      }, { loading: "Memeriksa akses…", success: "Pengaturan berhasil dibuka", error: "Akses ditolak" });
    } catch (value) { setError(value instanceof Error ? value.message : "Akses ditolak."); } finally { setBusy(false); }
  }
  async function lock() {
    if (busy) return; setBusy(true); setError(null);
    try {
      await notifyAction(async () => {
        const response = await fetch("/api/research/access", { method: "DELETE" });
        if (!response.ok) throw new Error("Pengaturan belum berhasil dikunci. Coba kembali.");
        opened.current = false; setUnlocked(false);
      }, { loading: "Mengunci pengaturan…", success: "Pengaturan berhasil dikunci" });
    } catch { setError("Pengaturan belum berhasil dikunci. Coba kembali."); } finally { setBusy(false); }
  }
  if (loading) return <p>Memuat pengaturan…</p>;
  if (unlocked) return <div className="flex flex-col gap-6"><div className="flex justify-end"><Button variant="outline" disabled={busy} onClick={() => void lock()}>Kunci pengaturan</Button></div>{error && <p role="alert">{error}</p>}<ResearchOperator onAccessExpired={accessExpired} /></div>;
  return <form className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border p-6" onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
    <h1 className="text-2xl font-semibold">Ruang peneliti</h1><p className="text-sm leading-6 text-muted-foreground">Masukkan password peneliti untuk mengakses hasil, sesi, dan pengaturan penelitian.</p>
    {!configured && <p className="text-sm leading-6">Password belum ditetapkan. Isi <code>RESEARCHER_KEY</code> pada <code>.env.local</code>, lalu restart LMS.</p>}
    <label className="block space-y-2 text-sm"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3" /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy || !configured}>{busy ? "Memeriksa…" : "Buka ruang peneliti"}</Button>
  </form>;
}

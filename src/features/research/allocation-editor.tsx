"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionConfirmation } from "@/components/action-confirmation";
import { notifyAction } from "@/lib/action-feedback";
import { toast } from "@/components/ui/toast";
import { AUI_PROFILES } from "../aui/config";
import { validateAllocation, type AllocationManifest } from "./allocation-schema";

type Loaded = { manifest: AllocationManifest; digest: string };
const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm";
const sequenceNames = ["A Adaptive → B Non-Adaptive", "A Non-Adaptive → B Adaptive", "B Adaptive → A Non-Adaptive", "B Non-Adaptive → A Adaptive"];
export function AllocationEditor({ onAccessExpired, onSaved }: { onAccessExpired: () => void; onSaved?: () => void }) {
  const [draft, setDraft] = useState<AllocationManifest | null>(null);
  const [digest, setDigest] = useState("");
  const [stationText, setStationText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  function load(data: Loaded) { setDraft(data.manifest); setDigest(data.digest); setStationText(data.manifest.stations.join(", ")); }
  useEffect(() => {
    let active = true;
    void fetch("/api/research/allocation", { cache: "no-store" }).then(async (response) => {
      const data = await response.json(); if (!response.ok) { if (response.status === 401) onAccessExpired(); throw new Error(data.error); }
      if (active) load(data as Loaded);
    }).catch((value: unknown) => { if (active) setError(value instanceof Error ? value.message : "Konfigurasi tidak dapat dimuat."); });
    return () => { active = false; };
  }, [onAccessExpired]);
  function current() { return validateAllocation({ ...draft, stations: stationText.split(/[\s,;]+/).filter(Boolean) }); }
  async function save() {
    if (busy) return; setBusy(true); setError(null); setMessage(null);
    try {
      await notifyAction(async () => {
        const manifest = current();
        const response = await fetch("/api/research/allocation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manifest, expectedDigest: digest }) });
        const data = await response.json(); if (!response.ok) { if (response.status === 401) onAccessExpired(); throw new Error(data.error); }
        load(data as Loaded); setMessage("Konfigurasi tersimpan di config/research-allocation.json. Sertakan berkas ini pada paket untuk semua PC lab."); onSaved?.();
      }, { loading: "Menyimpan konfigurasi alokasi…", success: "Konfigurasi alokasi berhasil disimpan" });
    } catch (value) { setError(value instanceof Error ? value.message : "Konfigurasi gagal disimpan."); } finally { setBusy(false); }
  }
  function download() {
    try {
      const manifest = current(); const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2) + "\n"], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "research-allocation.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.add({ type: "success", title: "Unduhan konfigurasi draf telah dimulai" });
    } catch (value) { const message = value instanceof Error ? value.message : "Konfigurasi tidak valid."; setError(message); toast.add({ type: "error", title: "Ekspor konfigurasi gagal", description: message }); }
  }
  async function importFile(file: File) {
    setError(null); setMessage(null);
    try { await notifyAction(async () => { if (file.size > 1000000) throw new Error("Berkas terlalu besar."); const manifest = validateAllocation(JSON.parse((await file.text()).replace(/^\uFEFF/, ""))); setDraft(manifest); setStationText(manifest.stations.join(", ")); setMessage("Berkas dimuat sebagai draf. Simpan untuk menerapkannya pada server."); }, { loading: "Membaca konfigurasi…", success: "Konfigurasi dimuat sebagai draf; simpan untuk menerapkan" }); }
    catch (value) { setError(value instanceof Error ? value.message : "Berkas tidak valid."); }
  }
  if (!draft) return <section className="rounded-xl border p-5"><h2 className="font-semibold">Alokasi peserta</h2><p className="mt-3 text-sm">{error || "Memuat konfigurasi…"}</p></section>;
  const counts = [1, 2, 3, 4].map((sequence) => draft.participants.filter((item) => item.enabled && item.sequence === sequence).length);
  return <section className="space-y-5 rounded-xl border p-5">
    <header className="space-y-2"><h2 className="text-lg font-semibold">Konfigurasi alokasi peserta</h2><p className="text-sm leading-6 text-muted-foreground">Siapkan sekali sebelum membagikan paket LMS ke PC lab. Materi A = Sampling Bias; B = Correlation vs Causation. Peserta hanya memasukkan kode peserta dan kode PC.</p></header>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm"><span>Versi konfigurasi</span><input className={field} value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} /></label>
      <label className="space-y-2 text-sm"><span>Jenis sesi untuk daftar ini</span><select className={field} value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as AllocationManifest["kind"] })}>{["TEST", "PILOT", "MAIN"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="space-y-2 text-sm"><span>Profil parameter AUI</span><select className={field} value={draft.profileId} onChange={(event) => setDraft({ ...draft, profileId: event.target.value as AllocationManifest["profileId"] })}>{Object.keys(AUI_PROFILES).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="space-y-2 text-sm"><span>Kode PC yang diizinkan (pisahkan dengan koma)</span><input className={field} value={stationText} onChange={(event) => setStationText(event.target.value)} /></label>
    </div>
    <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={draft.profileApprovedForMain} onChange={(event) => setDraft({ ...draft, profileApprovedForMain: event.target.checked })} /><span>Profil AUI di atas sudah dipilih melalui pilot untuk MAIN. Persetujuan instrumen dan metodologi tetap diperiksa terpisah.</span></label>
    <p className="text-xs text-muted-foreground">Peserta aktif pada urutan 1 / 2 / 3 / 4: {counts.join(" / ")}. Urutan tidak dihitung dari kode PC.</p>
    <div className="max-h-[32rem] overflow-auto rounded-lg border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Kode peserta</th><th className="p-3">Urutan</th><th className="p-3">Aktif</th><th className="p-3">Tindakan</th></tr></thead><tbody>{draft.participants.map((item, index) => <tr key={index} className="border-t">
      <td className="p-3"><input aria-label={"Kode peserta baris " + (index + 1)} maxLength={40} className={field} value={item.participantId} onChange={(event) => setDraft({ ...draft, participants: draft.participants.map((row, i) => i === index ? { ...row, participantId: event.target.value } : row) })} /></td>
      <td className="p-3"><select aria-label={"Urutan peserta baris " + (index + 1)} className={field} value={item.sequence} onChange={(event) => setDraft({ ...draft, participants: draft.participants.map((row, i) => i === index ? { ...row, sequence: Number(event.target.value) as 1 | 2 | 3 | 4 } : row) })}>{sequenceNames.map((name, i) => <option key={name} value={i + 1}>{i + 1} · {name}</option>)}</select></td>
      <td className="p-3"><input type="checkbox" aria-label={"Peserta aktif baris " + (index + 1)} checked={item.enabled} onChange={(event) => setDraft({ ...draft, participants: draft.participants.map((row, i) => i === index ? { ...row, enabled: event.target.checked } : row) })} /></td>
      <td className="p-3"><Button variant="ghost" size="sm" onClick={() => { setDraft({ ...draft, participants: draft.participants.filter((_, i) => i !== index) }); toast.add({ type: "info", title: "Baris peserta dihapus dari draf", description: "Simpan konfigurasi untuk menerapkan perubahan." }); }}>Hapus</Button></td>
    </tr>)}</tbody></table></div>
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => { setDraft({ ...draft, participants: [...draft.participants, { participantId: "", sequence: 1, enabled: true }] }); toast.add({ type: "info", title: "Baris peserta ditambahkan ke draf" }); }}>Tambah peserta</Button><Button disabled={busy} onClick={() => setConfirmSave(true)}>{busy ? "Menyimpan…" : "Simpan konfigurasi"}</Button><Button variant="outline" onClick={download}>Ekspor JSON draf</Button><label className="cursor-pointer text-sm underline">Impor JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ""; }} /></label></div>
    <p className="text-xs leading-6 text-muted-foreground">Naikkan versi sebelum menyimpan perubahan. Data sesi yang sudah dimulai memakai snapshot sebelumnya. Konfigurasi pada PC lain berubah hanya setelah berkas yang sama disalin ke paketnya.</p>
    {message && <p role="status" className="text-sm">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <ActionConfirmation open={confirmSave} onOpenChange={setConfirmSave} busy={busy} title="Simpan konfigurasi alokasi?" description="Perubahan akan digunakan untuk sesi baru pada PC ini. Pastikan versi, kode peserta, kode PC, dan urutan sudah sesuai." confirmLabel="Ya, simpan" onConfirm={() => void save()} />
  </section>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionConfirmation } from "@/components/action-confirmation";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import type { Answers, PublicStudy } from "./types";
import { questionnaireUsable, simulatedCLTAnswers, type CLTResponseSource } from "./clt";

export function StudyForm({ study, busy, onDraft, onSubmit, onSkip }: {
  study: PublicStudy; busy: boolean;
  onDraft: (answers: Answers, responseSource?: CLTResponseSource) => void;
  onSubmit: (answers: Answers, responseSource?: CLTResponseSource) => void;
  onSkip: () => void;
}) {
  const block = study.blocks[study.currentBlock];
  const phase = study.status as "PRETEST" | "CLT" | "POSTTEST";
  const [answers, setAnswers] = useState<Answers>(() => block.drafts[phase] ?? {});
  const [source, setSource] = useState<CLTResponseSource>(() => block.cltDraftSource ?? "PARTICIPANT");
  const [confirmation, setConfirmation] = useState<"SUBMIT" | "SKIP" | null>(null);
  const clt = phase === "CLT";
  const [step, setStep] = useState(() => {
    if (phase !== "CLT") return 0;
    const dimensions = ["ICL", "ECL", "GCL"];
    const first = dimensions.findIndex((dimension) => study.questionnaire.items.some((item) => item.dimension === dimension && !Number.isInteger(block.drafts.CLT?.[item.id])));
    return first < 0 ? 2 : first;
  });
  const definition = study.assessments.find((item) => item.materialId === block.materialId && item.phase === phase);
  const ready = !clt || questionnaireUsable(study.questionnaire, study.kind);
  const items = clt ? study.questionnaire.items.map((item) => ({ id: item.id, prompt: item.text,
    options: Array.from({ length: 9 }, (_, index) => String(index + 1)) })) : definition!.questions;
  const complete = items.every((item) => Number.isInteger(answers[item.id]) && (clt ? answers[item.id] >= 1 && answers[item.id] <= 9 : answers[item.id] >= 0 && answers[item.id] < item.options.length));
  const filled = items.filter((item) => Object.hasOwn(answers, item.id)).length;
  const visibleItems = clt ? items.filter((item) => item.id.startsWith(["ICL", "ECL", "GCL"][step])) : items;
  const stepComplete = visibleItems.every((item) => Number.isInteger(answers[item.id]) && answers[item.id] >= 1 && answers[item.id] <= 9);
  function navigateStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => document.getElementById("clt-section-title")?.focus());
  }
  function change(id: string, value: number) {
    const next = { ...answers, [id]: value }; setAnswers(next); onDraft(next, clt ? source : undefined);
  }
  function simulate(preset: "MIN" | "MAX" | "MIXED") {
    if (!clt || study.kind !== "TEST") return;
    const next = simulatedCLTAnswers(study.questionnaire, preset);
    setSource("SIMULATION"); setAnswers(next); onDraft(next, "SIMULATION");
    toast.add({ type: "info", title: "Jawaban simulasi diisi sebagai draf", description: "Belum dikirim. Periksa jawaban sebelum menekan tombol kirim." });
  }
  return <form className="flex max-w-3xl flex-col gap-7" onSubmit={(event) => {
    event.preventDefault();
    if (clt && step < 2) { if (ready && stepComplete && !busy) navigateStep(step + 1); return; }
    if (ready && complete && !busy) setConfirmation("SUBMIT");
  }}>
    <header className="space-y-3">
      <h1 className="text-3xl font-semibold">{clt ? study.questionnaire.title ?? "Kuesioner Beban Kognitif" : phase === "PRETEST" ? "Pengetahuan awal" : "Pemahaman setelah belajar"}</h1>
      {clt ? <div className="space-y-3 text-sm leading-7">
        <h2 className="font-medium">Petunjuk Pengisian</h2>
        {(study.questionnaire.instructions ?? ["Pilih satu nilai untuk setiap pernyataan berdasarkan pengalaman Anda selama mempelajari materi."]).map((text) => <p key={text}>{text}</p>)}
        <p>Gunakan skala 1 sampai 9: <strong>1 = {study.questionnaire.scale.lowerLabel}</strong> dan <strong>9 = {study.questionnaire.scale.upperLabel}</strong>.</p>
        <p>Semakin ke kiri, semakin tidak sesuai. Semakin ke kanan, semakin sesuai dengan pengalaman Anda. Pilih satu angka pada setiap pernyataan.</p>
        <p className="sm:hidden">Geser skala ke samping jika seluruh angka belum terlihat.</p>
      </div> : <p className="text-sm leading-6 text-muted-foreground">Pilih satu jawaban untuk setiap pertanyaan. Hasil dan pembahasan tidak ditampilkan selama eksperimen.</p>}
    </header>
    {!ready && <div role="status" className="rounded-xl border p-5">
      <p className="font-medium">Kuesioner belum tersedia untuk sesi ini.</p>
      <p className="mt-2 text-sm leading-6">Teks belum lengkap atau belum disetujui untuk jenis sesi ini. Hubungi peneliti.</p>
      {study.kind === "TEST" && !study.questionnaire.items.every((item) => item.text?.trim()) && <Button type="button" className="mt-4" variant="outline" disabled={busy} onClick={() => setConfirmation("SKIP")}>Lewati CLT kosong untuk TEST teknis</Button>}
    </div>}
    {clt && study.kind === "TEST" && ready && <details className="rounded-xl border border-dashed p-4 text-sm">
      <summary className="cursor-pointer font-medium">Simulasi jawaban · TEST</summary>
      <p className="my-3 leading-6">Jawaban yang diisi melalui bagian ini ditandai SIMULATION di data. Pengiriman tetap memakai tombol kirim dan tidak dilakukan otomatis.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => simulate("MIN")}>Isi semua 1</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => simulate("MAX")}>Isi semua 9</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => simulate("MIXED")}>Isi contoh campuran</Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setAnswers({}); onDraft({}, source); toast.add({ type: "info", title: "Draf jawaban dikosongkan" }); }}>Kosongkan jawaban</Button>
      </div>
      {source === "SIMULATION" && <p className="mt-3 text-xs">Set jawaban ini merupakan data simulasi TEST.</p>}
    </details>}
    {clt && <div className="flex flex-col gap-3"><h2 id="clt-section-title" tabIndex={-1} className="text-xl font-semibold">Bagian {step + 1} dari 3</h2><Progress value={filled / 15 * 100} aria-label="Progress jawaban kuesioner" /></div>}
    {visibleItems.map((item, index) => <fieldset key={item.id} data-item-id={item.id} aria-labelledby={`${item.id}-prompt`} disabled={busy || !ready} className="flex min-w-0 flex-col gap-4 rounded-xl border p-5">
      <legend className="px-2 text-sm font-medium">{clt ? "Pernyataan" : "Soal"} {index + 1}</legend>
      <p id={`${item.id}-prompt`} className="leading-7">{item.prompt || "[" + item.id + "] Teks belum tersedia"}</p>
      {clt ? <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[22.5rem] flex-col gap-3">
          <div className="grid grid-cols-9 gap-1" aria-describedby={`${item.id}-scale`}>
            {item.options.map((option, optionIndex) => {
              const value = optionIndex + 1;
              return <label key={value} className={cn("flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg py-3 text-sm hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring", answers[item.id] === value && "bg-accent")}>
                <span aria-hidden="true">{option}</span>
                <input required type="radio" name={item.id} className="size-5 accent-primary" aria-label={`${value} dari 9`} aria-describedby={`${item.id}-scale`} value={value} checked={answers[item.id] === value} onChange={() => change(item.id, value)} />
              </label>;
            })}
          </div>
          <div id={`${item.id}-scale`} className="flex justify-between gap-6 text-xs leading-5 text-muted-foreground">
            <span className="max-w-36">← 1 · {study.questionnaire.scale.lowerLabel}</span>
            <span className="max-w-36 text-right">9 · {study.questionnaire.scale.upperLabel} →</span>
          </div>
        </div>
      </div> : <div className="flex flex-col gap-3">{item.options.map((option, value) => <label key={value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm", answers[item.id] === value && "border-primary bg-primary/5")}>
        <input required type="radio" name={item.id} value={value} checked={answers[item.id] === value} onChange={() => change(item.id, value)} /><span>{String.fromCharCode(65 + value)}. {option}</span>
      </label>)}</div>}
    </fieldset>)}
    <p aria-live="polite" className="text-sm text-muted-foreground">{filled} dari {items.length} terisi.</p>
    <div className="flex flex-wrap gap-3">
      {clt && step > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => navigateStep(step - 1)}>Kembali</Button>}
      <Button type="submit" disabled={!ready || busy || (clt && step < 2 ? !stepComplete : !complete)}>{busy ? "Menyimpan…" : clt && step < 2 ? "Lanjut" : clt ? "Kirim kuesioner" : "Kirim dan lanjutkan"}</Button>
    </div>
    <ActionConfirmation open={confirmation !== null} onOpenChange={(open) => { if (!open) setConfirmation(null); }} busy={busy}
      title={confirmation === "SKIP" ? "Lewati kuesioner kosong?" : clt ? "Kirim jawaban kuesioner?" : phase === "PRETEST" ? "Kirim jawaban pretest?" : "Kirim jawaban posttest?"}
      description={confirmation === "SKIP" ? "CLT tidak akan mempunyai jawaban atau skor pada blok TEST ini." : "Pastikan seluruh jawaban sudah sesuai. Jawaban yang telah dikirim tidak dapat diubah."}
      confirmLabel={confirmation === "SKIP" ? "Ya, lewati" : "Ya, kirim"}
      onConfirm={() => { if (confirmation === "SKIP") onSkip(); else if (ready && complete && !busy) onSubmit(answers, clt ? source : undefined); }} />
  </form>;
}

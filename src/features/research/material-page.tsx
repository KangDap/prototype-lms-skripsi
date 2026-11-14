"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdaptiveProvider } from "../aui/adaptive-provider";
import type { Course, LearningMaterial } from "../lms/types";
import { getResearchMaterial } from "./content";
import { MaterialView } from "./material-view";
import { StudyForm } from "./forms";
import { ResearchLearning } from "./learning";
import { useResearchSession } from "./session-provider";
import { RESEARCH_COURSE_PATH } from "./routing";

export function StudyMaterialPage({ course, material }: { course: Course; material: LearningMaterial }) {
  const { study, loading, busy, command, saveDraft, transport, allowDebug, retry, onError } = useResearchSession();
  const router = useRouter();
  const attemptedStart = useRef<string | null>(null);
  const completingBlock = useRef<string | null>(null);
  const previousStage = useRef<string | null>(null);
  const blockIndex = study?.blocks.findIndex((item) => item.materialId === material.id) ?? -1;
  const current = study?.blocks[study.currentBlock];
  const viewed = study?.blocks[blockIndex];
  const advanceKey = study && study.status === "BREAK" && blockIndex === study.currentBlock + 1 ? study.id + ":" + material.id : null;
  const legacyStart = study?.status === "CHECK_IN" && viewed?.id === current?.id;
  const startKey = advanceKey ?? (legacyStart && study ? study.id + ":direct-pretest" : null);
  const stageKey = !loading && study ? `${study.id}:${material.id}:${study.currentBlock}:${study.status}` : null;
  useEffect(() => {
    if (!stageKey) return;
    const changed = previousStage.current !== null && previousStage.current !== stageKey;
    previousStage.current = stageKey;
    // Only stage transitions reset scroll. Initial entry/resume and AUI changes
    // retain the reader's saved position; answer autosaves keep the same key.
    if (!changed) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [stageKey]);
  useEffect(() => {
    if (loading || !startKey || attemptedStart.current === startKey) return;
    attemptedStart.current = startKey;
    void command(advanceKey ? "NEXT_BLOCK" : "START_MATERIAL");
  }, [loading, startKey, advanceKey, command]);
  useEffect(() => {
    if (loading || !study || !viewed) return;
    if (!viewed.completedAt && viewed.id === current?.id && study.status !== "INCOMPLETE") completingBlock.current = viewed.id;
    if (viewed.completedAt && completingBlock.current === viewed.id) {
      completingBlock.current = null;
      router.replace(RESEARCH_COURSE_PATH);
    }
  }, [loading, study, viewed, current?.id, router]);

  const content = study?.materials.find((item) => item.id === material.id) ?? getResearchMaterial(material.id);
  const back = <Link href={"/courses/" + course.id} className="text-sm text-muted-foreground underline underline-offset-4">Kembali ke {course.title}</Link>;
  if (loading) return <div className="space-y-4"><p>Memuat pembelajaran…</p><Button variant="outline" onClick={() => void retry()}>Coba kembali</Button></div>;
  if (!study) return <div className="flex w-full min-w-0 flex-col gap-7">{back}<h1 className="text-3xl font-semibold">{material.title}</h1>{content && <MaterialView material={content} />}</div>;
  if (blockIndex < 0 || !content) return <p>Materi ini tidak termasuk dalam sesi pembelajaran Anda.</p>;
  if (advanceKey || legacyStart) return <div className="space-y-4"><p>Menyiapkan materi…</p><Button variant="outline" disabled={busy} onClick={() => void command(advanceKey ? "NEXT_BLOCK" : "START_MATERIAL")}>Coba kembali</Button></div>;
  if (blockIndex > study.currentBlock) return <div className="space-y-4"><h1 className="text-2xl font-semibold">Materi belum tersedia</h1><p>Selesaikan materi yang sedang aktif terlebih dahulu.</p>{back}</div>;
  const readOnly = blockIndex < study.currentBlock || ["BREAK", "COMPLETED", "INCOMPLETE"].includes(study.status);
  if (readOnly) return <div className="flex w-full min-w-0 flex-col gap-7">{back}<h1 className="text-3xl font-semibold">{content.title}</h1><p className="rounded-xl border p-4 text-sm">{study.status === "INCOMPLETE" ? "Sesi telah diakhiri. Materi tetap dapat dibaca." : "Materi ini sudah selesai. Anda dapat membacanya kembali."}</p><MaterialView material={content} /></div>;
  if (!current || !transport) return <Link href={RESEARCH_COURSE_PATH}>Kembali ke course</Link>;
  return <div className="space-y-6">
    {back}
    {study.status === "LEARNING" && <AdaptiveProvider key={study.id + ":" + current.id} courseId={course.id} materialId={material.id} condition={current.condition} aggregationConfig={study.config} profileId={study.profileId} researchManaged debugAllowed={allowDebug && study.kind === "TEST" && current.condition === "ADAPTIVE"}>
      <ResearchLearning study={study} transport={transport} onDone={() => undefined} onError={onError} />
    </AdaptiveProvider>}
    {["PRETEST", "POSTTEST", "CLT"].includes(study.status) && <StudyForm key={study.id + ":" + current.id + ":" + study.status} study={study} busy={busy} onDraft={saveDraft}
      onSubmit={(answers, responseSource) => void command("SUBMIT", { answers, phase: study.status, blockId: current.id, ...(study.status === "CLT" ? { responseSource } : {}) })}
      onSkip={() => void command("SKIP_DRAFT_CLT")} />}
  </div>;
}

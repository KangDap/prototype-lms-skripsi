"use client";

import Link from "next/link";
import type { Course, LearningMaterial } from "../lms/types";
import { AdaptiveControls, AssistanceOffer } from "./adaptive-controls";
import { useAdaptiveUI } from "./adaptive-provider";
import { AUIDebugPanel } from "./aui-debug-panel";
import { getAdaptiveUIConfig } from "./config";
import { getResearchMaterial } from "../research/content";
import { MaterialView } from "../research/material-view";

export function AdaptiveMaterial({ course, material }: { course: Course; material: LearningMaterial }) {
  const { session, snapshot } = useAdaptiveUI();
  const config = getAdaptiveUIConfig(snapshot.engine.mode);
  const researchMaterial = getResearchMaterial(material.id);
  return <div data-aui-mode={config.mode} data-aui-phase={snapshot.engine.phase} className="adaptive-material flex w-full min-w-0 flex-col gap-6">
    <Link href={`/courses/${course.id}`} className="w-fit text-sm text-muted-foreground hover:underline">Kembali ke {course.title}</Link>
    <header className="flex flex-col gap-3">
      <p hidden={!config.showSecondaryWidgets} className="text-sm text-muted-foreground">{course.title}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{material.title}</h1>
      <p hidden={!config.showSecondaryWidgets} className="text-sm text-muted-foreground">{material.durationMinutes} menit</p>
    </header>
    <AdaptiveControls />
    <p className="rounded-xl border p-4 text-sm leading-6">Halaman ini adalah pratinjau materi. Untuk mencatat pretest, pembelajaran, CLT, dan posttest dalam satu sesi, gunakan <Link href="/study" className="underline">alur penelitian</Link>.</p>
    {/* Keep this article mounted with identical content across all UI modes. */}
    {researchMaterial ? <MaterialView material={researchMaterial} mode={config.mode} onCloseAssistance={() => session.manual("RETURN_DEFAULT", performance.now())} /> : <article aria-labelledby="material-introduction" className="flex scroll-mt-6 flex-col gap-4 border-t pt-7">
      <h2 id="material-introduction" className="scroll-mt-6 text-lg font-semibold">Pengantar</h2>
      <p className="text-base leading-8">{material.introduction}</p>
    </article>}
    <AssistanceOffer />
    <AUIDebugPanel />
  </div>;
}

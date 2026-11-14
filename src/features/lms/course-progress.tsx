"use client";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useResearchSession } from "../research/session-provider";
import { withStudyProgress } from "../research/routing";
import { getCourseProgress, type Course } from "./types";
export function StudyCourseProgress({ course }: { course: Course }) {
  const { study } = useResearchSession();
  const progress = getCourseProgress(withStudyProgress(course, study));
  return <div className="flex max-w-xl flex-col gap-2"><div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{progress.completed} dari {progress.total} materi selesai</span><span>{progress.percentage}%</span></div><Progress value={progress.percentage} aria-label={"Progres " + course.title} />
    {study?.status === "COMPLETED" && <p className="text-sm leading-7">Kedua materi selesai. Silakan beri tahu peneliti. {study.kind !== "MAIN" && <Link href="/pilot-review" className="font-medium underline underline-offset-4">Buka peninjauan bahasa CLT · Pilot</Link>}</p>}
  </div>;
}

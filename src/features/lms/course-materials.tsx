"use client";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourseProgress, type Course } from "./types";
import { useResearchSession } from "../research/session-provider";
import { materialLetter, RESEARCH_COURSE_ID, withStudyProgress } from "../research/routing";

export function CourseMaterials({ course: seedCourse }: { course: Course }) {
  const { study, loading } = useResearchSession();
  const course = withStudyProgress(seedCourse, study);
  const progress = getCourseProgress(course);
  return <section aria-labelledby="course-materials-title" className="min-w-0">
    <Card>
      <CardHeader><CardTitle><h2 id="course-materials-title">Materi pembelajaran</h2></CardTitle></CardHeader>
      <CardContent>
        {!course.materials.length && <p className="py-8 text-sm text-muted-foreground">Belum ada materi.</p>}
        <ol className="divide-y divide-border" aria-label="Urutan materi pembelajaran">
          {course.materials.map((material, index) => {
            const block = course.id === RESEARCH_COURSE_ID ? study?.blocks.find((item) => item.materialId === material.id) : undefined;
            const locked = loading || Boolean(study && block && block.order > study.currentBlock + 1 && !(study.status === "BREAK" && block.order === 2));
            const href = "/courses/" + course.id + "/materials/" + material.id;
            const started = Boolean(block && block.phaseTimes.PRETEST);
            return <li key={material.id} className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center">
              <span className="text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <div className="space-y-2">
                {locked ? <h3 className="text-sm font-medium">{material.title}</h3> : <Link className="text-sm font-medium hover:underline" href={href}>{material.title}</Link>}
                <p className="text-xs text-muted-foreground">{block ? "Materi " + materialLetter(block.materialId) + " · " : ""}15–20 menit</p>
                <Badge variant={material.completed ? "success" : locked ? "outline" : started ? "info" : "pending"}>{material.completed ? "Selesai" : locked ? "Belum tersedia" : started ? "Sedang dipelajari" : "Belum dimulai"}</Badge>
              </div>
              {locked ? <Button disabled variant="outline" size="sm" className="col-start-2 w-fit sm:col-start-auto"><LockKeyhole />Belum tersedia</Button> :
                <Link href={href} aria-label={"Buka materi " + material.title} className={buttonVariants({ variant: "outline", size: "sm", className: "col-start-2 w-fit sm:col-start-auto" })}>{material.completed ? "Baca kembali" : "Buka materi"}<ArrowRight /></Link>}
            </li>;
          })}
        </ol>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span>{progress.total} materi</span><span>{progress.completed} selesai</span></CardFooter>
    </Card>
  </section>;
}

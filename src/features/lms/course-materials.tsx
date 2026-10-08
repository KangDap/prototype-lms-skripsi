import Link from "next/link";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCourseProgress, type Course } from "./types";

export function CourseMaterials({ course }: { course: Course }) {
  const progress = getCourseProgress(course);

  return (
    <section aria-labelledby="course-materials-title" className="min-w-0">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="course-materials-title">Materi pembelajaran</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {course.materials.length === 0 ? (
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyTitle>Belum ada materi</EmptyTitle>
                <EmptyDescription>
                  Materi akan muncul di sini setelah ditambahkan.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ol
              className="divide-y divide-border"
              aria-label="Urutan materi pembelajaran"
            >
              {course.materials.map((material, index) => {
                const href = `/courses/${course.id}/materials/${material.id}`;
                return (
                  <li
                    key={material.id}
                    className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-5 first:pt-0 last:pb-0 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span
                      className="text-sm tabular-nums text-muted-foreground"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Link
                        href={href}
                        className="text-sm font-medium hover:underline"
                      >
                        {material.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {material.durationMinutes} menit
                      </span>
                      <Badge
                        variant={material.completed ? "secondary" : "outline"}
                      >
                        {material.completed ? "Selesai" : "Belum selesai"}
                      </Badge>
                    </div>
                    <Link
                      href={href}
                      aria-label={`Buka materi ${material.title}`}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "col-start-2 w-fit sm:col-start-auto",
                        }),
                      )}
                    >
                      Buka materi
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {progress.total} materi
          </span>
          <span className="text-xs text-muted-foreground">
            {progress.completed} selesai
          </span>
        </CardFooter>
      </Card>
    </section>
  );
}

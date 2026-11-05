import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { assignments, courses } from "@/features/lms/seed-data";
import { CourseActivities } from "@/features/lms/course-activities";
import { CourseArtwork } from "@/features/lms/course-artwork";
import { getCourseProgress } from "@/features/lms/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = courses.find((item) => item.id === courseId);
  return {
    title: course
      ? `${course.title} — Ruang Belajar`
      : "Mata kuliah tidak ditemukan",
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = courses.find((item) => item.id === courseId);
  if (!course) notFound();
  const progress = getCourseProgress(course);

  return (
    <>
      <Link
        href="/courses"
        className={cn(
          buttonVariants({
            variant: "outline",
            size: "sm",
            className: "w-fit",
          }),
        )}
      >
        <ArrowLeft data-icon="inline-start" />
        Kembali
      </Link>
      <header className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
            <p className="text-sm">{course.lecturer}</p>
          </div>
          <div className="flex max-w-xl flex-col gap-2">
            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {progress.completed} dari {progress.total} materi selesai
              </span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress
              value={progress.percentage}
              aria-label={`Progres ${course.title}`}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <CourseArtwork variant={course.artwork} />
        </div>
      </header>
      <CourseActivities
        key={course.id}
        course={course}
        assignments={assignments}
        now={new Date().toISOString()}
      />
    </>
  );
}

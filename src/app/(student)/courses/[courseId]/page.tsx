import Link from "next/link";
import { notFound } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { assignments, courses } from "@/features/lms/seed-data";
import { CourseActivities } from "@/features/lms/course-activities";
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
        className="w-fit text-sm text-muted-foreground hover:underline"
      >
        Kembali ke mata kuliah
      </Link>
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {course.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {course.description}
        </p>
        <p className="text-sm">{course.lecturer}</p>
      </header>
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
      <CourseActivities
        key={course.id}
        course={course}
        assignments={assignments}
        now={new Date().toISOString()}
      />
    </>
  );
}

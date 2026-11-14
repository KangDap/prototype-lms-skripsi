import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { assignments, courses } from "@/features/lms/seed-data";
import { CourseActivities } from "@/features/lms/course-activities";
import { CourseArtwork } from "@/features/lms/course-artwork";
import { CourseMaterials } from "@/features/lms/course-materials";
import { StudyCourseProgress } from "@/features/lms/course-progress";

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
          <StudyCourseProgress course={course} />
        </div>
        <div className="overflow-hidden rounded-xl border">
          <CourseArtwork variant={course.artwork} />
        </div>
      </header>
      {course.meetings.length === 0 ? <CourseMaterials course={course} /> : <CourseActivities
        key={course.id}
        course={course}
        assignments={assignments}
        now={new Date().toISOString()}
      />}
    </>
  );
}

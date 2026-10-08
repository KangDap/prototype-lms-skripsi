import Link from "next/link";
import { notFound } from "next/navigation";
import { courses } from "@/features/lms/seed-data";

export function generateStaticParams() {
  return courses.flatMap((course) =>
    course.materials.map((material) => ({
      courseId: course.id,
      materialId: material.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>;
}) {
  const { courseId, materialId } = await params;
  const material = courses
    .find((course) => course.id === courseId)
    ?.materials.find((item) => item.id === materialId);
  return {
    title: material
      ? `${material.title} — Ruang Belajar`
      : "Materi tidak ditemukan",
  };
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>;
}) {
  const { courseId, materialId } = await params;
  const course = courses.find((item) => item.id === courseId);
  const material = course?.materials.find((item) => item.id === materialId);
  if (!course || !material) notFound();

  return (
    <>
      <Link
        href={`/courses/${course.id}`}
        className="w-fit text-sm text-muted-foreground hover:underline"
      >
        Kembali ke {course.title}
      </Link>
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm text-muted-foreground">{course.title}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {material.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {material.durationMinutes} menit
        </p>
      </header>
      <article className="flex max-w-3xl flex-col gap-4 border-t pt-7">
        <h2 className="text-lg font-semibold">Pengantar</h2>
        <p className="text-base leading-8">{material.introduction}</p>
      </article>
    </>
  );
}

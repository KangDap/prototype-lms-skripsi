import { notFound } from "next/navigation";
import { courses } from "@/features/lms/seed-data";
import { StudyMaterialPage } from "@/features/research/material-page";

export const dynamic = "force-dynamic";

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

  return <StudyMaterialPage key={`${courseId}/${materialId}`} course={course} material={material} />;
}

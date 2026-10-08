import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignments, courses } from "@/features/lms/seed-data";
import { formatDeadline } from "@/features/lms/assignment-dates";

export function generateStaticParams() {
  return assignments.map((assignment) => ({ assignmentId: assignment.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = assignments.find((item) => item.id === assignmentId);
  return {
    title: assignment
      ? `${assignment.title} — Ruang Belajar`
      : "Tugas tidak ditemukan",
  };
}

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = assignments.find((item) => item.id === assignmentId);
  if (!assignment) notFound();
  const course = courses.find((item) => item.id === assignment.courseId);
  if (!course) notFound();

  return (
    <>
      <header className="flex max-w-3xl flex-col gap-3">
        <Link
          href={`/courses/${course.id}`}
          className="w-fit text-sm text-muted-foreground hover:underline"
        >
          {course.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {assignment.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {assignment.description}
        </p>
      </header>
      <div className="grid max-w-5xl items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Instruksi tugas</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm leading-relaxed">
              {assignment.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Informasi tugas</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-5 text-sm">
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground">Tenggat pengumpulan</dt>
                <dd>
                  <time dateTime={assignment.dueAt}>
                    {formatDeadline(assignment.dueAt)}
                  </time>
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground">Dosen</dt>
                <dd>{course.lecturer}</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    variant={assignment.submittedAt ? "secondary" : "outline"}
                  >
                    {assignment.submittedAt
                      ? "Dikumpulkan"
                      : "Belum dikumpulkan"}
                  </Badge>
                </dd>
              </div>
              {assignment.submittedAt && (
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground">Dikumpulkan pada</dt>
                  <dd>
                    <time dateTime={assignment.submittedAt}>
                      {formatDeadline(assignment.submittedAt)}
                    </time>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
      <Link
        href="/calendar"
        className={buttonVariants({ variant: "outline", className: "w-fit" })}
      >
        Lihat kalender tenggat
      </Link>
    </>
  );
}

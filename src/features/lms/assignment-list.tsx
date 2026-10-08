import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDeadline } from "./assignment-dates";
import { courses } from "./seed-data";
import type { Assignment } from "./types";

export function AssignmentList({
  items,
  emptyTitle = "Belum ada tugas",
  emptyDescription = "Tugas akan muncul di sini setelah ditambahkan.",
}: {
  items: Assignment[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0)
    return (
      <Empty className="min-h-48">
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ul className="divide-y divide-border">
      {[...items]
        .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
        .map((assignment) => (
          <li key={assignment.id}>
            <Link
              href={`/assignments/${assignment.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md py-5 outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">{assignment.title}</span>
                <span className="text-xs text-muted-foreground">
                  {
                    courses.find((course) => course.id === assignment.courseId)
                      ?.title
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  Tenggat:{" "}
                  <time dateTime={assignment.dueAt}>
                    {formatDeadline(assignment.dueAt)}
                  </time>
                </span>
              </span>
              <Badge variant={assignment.submittedAt ? "secondary" : "outline"}>
                {assignment.submittedAt ? "Dikumpulkan" : "Belum dikumpulkan"}
              </Badge>
            </Link>
          </li>
        ))}
    </ul>
  );
}

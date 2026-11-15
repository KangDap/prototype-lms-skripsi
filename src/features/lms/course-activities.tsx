"use client";

import Link from "next/link";
import { cn } from "cn";
import { ArrowRight, ChevronDown, ClipboardList, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDeadline, formatDeadlineDay } from "./assignment-dates";
import type { Assignment, Course } from "./types";

export function CourseActivities({
  course,
  assignments,
  now,
}: {
  course: Course;
  assignments: Assignment[];
  now: string;
}) {
  if (course.meetings.length === 0) {
    return (
      <Empty className="min-h-40 border">
        <EmptyHeader>
          <EmptyTitle>Belum ada pertemuan</EmptyTitle>
          <EmptyDescription>
            Materi dan tugas akan muncul setelah pertemuan ditambahkan.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section
      aria-label="Aktivitas perkuliahan"
      className="flex min-w-0 flex-col gap-6"
    >
      {course.meetings.map((meeting, index) => {
        const activities = meeting.activities.map((activity) => {
          if (activity.type === "material") {
            const material = course.materials.find(
              (item) => item.id === activity.materialId,
            );
            if (!material)
              throw new Error(
                `Materi ${activity.materialId} tidak ditemukan pada ${course.id}.`,
              );
            return {
              id: `material-${material.id}`,
              type: "material" as const,
              title: material.title,
              href: `/courses/${course.id}/materials/${material.id}`,
              detail: `Materi · ${material.durationMinutes} menit`,
              completed: material.completed,
              overdue: false,
              status: material.completed ? "Selesai" : "Belum selesai",
            };
          }
          const assignment = assignments.find(
            (item) =>
              item.id === activity.assignmentId && item.courseId === course.id,
          );
          if (!assignment)
            throw new Error(
              `Tugas ${activity.assignmentId} tidak ditemukan pada ${course.id}.`,
            );
          const completed = Boolean(assignment.submittedAt);
          const overdue =
            !completed && Date.parse(assignment.dueAt) < Date.parse(now);
          return {
            id: `assignment-${assignment.id}`,
            type: "assignment" as const,
            title: assignment.title,
            href: `/assignments/${assignment.id}`,
            detail: `Tugas · Tenggat: ${formatDeadline(assignment.dueAt)}`,
            completed,
            overdue,
            status: completed
              ? "Dikumpulkan"
              : overdue
                ? "Terlambat"
                : "Belum dikumpulkan",
          };
        });
        const completedCount = activities.filter(
          (activity) => activity.completed,
        ).length;
        const titleId = `meeting-${course.id}-${meeting.id}`;

        return (
          <section key={meeting.id} aria-labelledby={titleId}>
            <Collapsible>
              <Card>
                <CardHeader className="gap-3">
                  <CardTitle>
                    <h2 id={titleId}>
                      Pertemuan {index + 1} · {meeting.title}
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    <time dateTime={meeting.date}>
                      {formatDeadlineDay(`${meeting.date}T00:00:00+07:00`)}
                    </time>
                  </CardDescription>
                  <CardAction>
                    <CollapsibleTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Tampilkan atau sembunyikan pertemuan ${index + 1}`}
                        />
                      }
                    >
                      <ChevronDown className="transition-transform group-aria-expanded/button:rotate-180" />
                    </CollapsibleTrigger>
                  </CardAction>
                </CardHeader>
                <CollapsibleContent className="flex flex-col gap-4">
                  <CardContent className="flex flex-col gap-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {meeting.description}
                    </p>
                    {activities.length === 0 ? (
                      <Empty className="min-h-40">
                        <EmptyHeader>
                          <EmptyTitle>Belum ada aktivitas</EmptyTitle>
                          <EmptyDescription>
                            Materi dan tugas untuk pertemuan ini belum
                            ditambahkan.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <ul
                        className="divide-y divide-border"
                        aria-label={`Aktivitas pertemuan ${index + 1}`}
                      >
                        {activities.map((activity) => {
                          const Icon =
                            activity.type === "material"
                              ? FileText
                              : ClipboardList;
                          const action =
                            activity.type === "material"
                              ? "Buka materi"
                              : "Lihat tugas";
                          return (
                            <li
                              key={activity.id}
                              className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center"
                            >
                              <div
                                className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                                aria-hidden="true"
                              >
                                <Icon className="size-4" />
                              </div>
                              <div className="flex min-w-0 flex-col gap-1.5">
                                <Link
                                  href={activity.href}
                                  className="text-sm font-medium hover:underline"
                                >
                                  {activity.title}
                                </Link>
                                <span className="text-xs leading-relaxed text-muted-foreground">
                                  {activity.detail}
                                </span>
                                <Badge
                                  variant={
                                    activity.completed
                                      ? "success"
                                      : activity.overdue
                                        ? "destructive"
                                        : "pending"
                                  }
                                >
                                  {activity.status}
                                </Badge>
                              </div>
                              <Link
                                href={activity.href}
                                aria-label={`${action} ${activity.title}`}
                                className={cn(
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                    className:
                                      "col-start-2 w-fit sm:col-start-auto",
                                  }),
                                )}
                              >
                                {action}
                                <ArrowRight data-icon="inline-end" />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                  <CardFooter>
                    <span className="text-xs text-muted-foreground">
                      {completedCount} dari {activities.length} aktivitas
                      selesai
                    </span>
                  </CardFooter>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </section>
        );
      })}
    </section>
  );
}

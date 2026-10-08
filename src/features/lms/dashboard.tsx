"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { CourseCard } from "./course-card";
import { AssignmentTimeline } from "./assignment-timeline";
import { assignments, courses, recentActivities, student } from "./seed-data";
import { useStudentLms } from "./student-shell";
import type { DashboardView } from "./student-sidebar";

export function LmsDashboard({
  view,
  now,
}: {
  view: DashboardView;
  now?: string;
}) {
  const [query, setQuery] = useState("");
  const { savedIds, toggleSaved } = useStudentLms();
  const title =
    view === "dashboard"
      ? "Dashboard"
      : view === "courses"
        ? "Mata kuliah"
        : "Tersimpan";
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = `${course.title} ${course.code} ${course.lecturer}`
      .toLocaleLowerCase("id")
      .includes(query.trim().toLocaleLowerCase("id"));
    return matchesSearch && (view !== "saved" || savedIds.includes(course.id));
  });
  const materials = courses.flatMap((course) => course.materials);
  const overview = [
    { label: "Mata kuliah", value: courses.length },
    {
      label: "Tugas belum dikumpulkan",
      value: assignments.filter((assignment) => !assignment.submittedAt).length,
    },
    {
      label: "Materi selesai",
      value: materials.filter((material) => material.completed).length,
      total: materials.length,
    },
  ];

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {view === "dashboard" && (
          <p className="text-sm text-muted-foreground">
            Selamat datang,{" "}
            <span className="font-medium text-foreground">{student.name}</span>
          </p>
        )}
      </header>
      {view === "dashboard" && (
        <>
          <section
            aria-label="Ringkasan pembelajaran"
            className="grid gap-4 sm:grid-cols-3"
          >
            {overview.map((item) => (
              <Card key={item.label} size="sm">
                <CardHeader>
                  <CardTitle>
                    <h2>{item.label}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {item.value}
                    {item.total !== undefined && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / {item.total}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          {now && <AssignmentTimeline now={now} />}
        </>
      )}
      <InputGroup className="h-11">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Cari mata kuliah"
          placeholder="Cari mata kuliah..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Hapus pencarian"
              onClick={() => setQuery("")}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <section className="flex flex-col gap-5" aria-labelledby="courses-title">
        <h2 id="courses-title" className="text-xl font-semibold">
          {view === "saved" ? "Mata kuliah tersimpan" : "Mata kuliah saya"}
        </h2>
        <div className="grid gap-5 min-[580px]:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              saved={savedIds.includes(course.id)}
              onSave={() => toggleSaved(course.id)}
            />
          ))}
        </div>
        {filteredCourses.length === 0 && (
          <Empty className="min-h-56 border">
            <EmptyHeader>
              <EmptyTitle>
                {view === "saved" && !query
                  ? "Belum ada mata kuliah tersimpan"
                  : "Mata kuliah tidak ditemukan"}
              </EmptyTitle>
              <EmptyDescription>
                {view === "saved" && !query
                  ? "Simpan mata kuliah menggunakan penanda pada kartu."
                  : "Coba kata kunci lain."}
              </EmptyDescription>
            </EmptyHeader>
            {query && (
              <EmptyContent>
                <Button variant="outline" onClick={() => setQuery("")}>
                  Hapus pencarian
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
      </section>
      {view === "dashboard" && (
        <section aria-labelledby="activity-title">
          <Card className="gap-5">
            <CardHeader>
              <CardTitle>
                <h2 id="activity-title">Aktivitas terbaru</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <Empty className="min-h-48">
                  <EmptyHeader>
                    <EmptyTitle>Belum ada aktivitas</EmptyTitle>
                    <EmptyDescription>
                      Aktivitas pembelajaran Anda akan muncul di sini.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {recentActivities.map((activity) => {
                    const course = courses.find(
                      (item) => item.id === activity.courseId,
                    );
                    return (
                      <li
                        key={activity.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/courses/${activity.courseId}/materials/${activity.materialId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {activity.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {course?.title}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activity.completed ? "Selesai" : "Terakhir dibuka"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}

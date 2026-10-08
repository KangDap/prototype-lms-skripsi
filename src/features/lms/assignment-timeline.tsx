"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
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
import {
  formatDeadlineDay,
  formatDeadlineTime,
  getDeadlineDay,
} from "./assignment-dates";
import { assignments, courses } from "./seed-data";
import type { Assignment } from "./types";

const statusFilters = {
  all: "Semua status",
  pending: "Belum dikumpulkan",
  submitted: "Dikumpulkan",
};

const dayFilters = {
  all: "Semua tenggat",
  today: "Hari ini",
  week: "7 hari ke depan",
  month: "30 hari ke depan",
  overdue: "Terlambat",
};

function AssignmentFilter<T extends string>({
  label,
  ariaLabel,
  options,
  value,
  onValueChange,
}: {
  label: string;
  ariaLabel: string;
  options: Record<T, string>;
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            aria-label={ariaLabel}
            className="max-w-full"
          />
        }
      >
        <span className="max-w-48 truncate" title={options[value]}>
          {options[value]}
        </span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(nextValue) => onValueChange(nextValue as T)}
          >
            {Object.entries<string>(options).map(([option, text]) => (
              <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                {text}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssignmentTimeline({
  now,
  items = assignments,
  initialStatus = "pending",
  title = "Timeline tugas",
  headerAction,
  showAllLink = true,
  showCourseFilter = true,
  emptyDescription = "Tugas akan muncul di sini setelah ditambahkan.",
}: {
  now: string;
  items?: Assignment[];
  initialStatus?: keyof typeof statusFilters;
  title?: string;
  headerAction?: ReactNode;
  showAllLink?: boolean;
  showCourseFilter?: boolean;
  emptyDescription?: string;
}) {
  const [status, setStatus] =
    useState<keyof typeof statusFilters>(initialStatus);
  const [courseId, setCourseId] = useState("all");
  const [days, setDays] = useState<keyof typeof dayFilters>("all");
  const [sort, setSort] = useState("ascending");
  const [query, setQuery] = useState("");
  const currentTime = Date.parse(now);
  const today = getDeadlineDay(now);
  const startOfToday = Date.parse(`${today}T00:00:00+07:00`);
  const courseFilters = {
    all: "Semua mata kuliah",
    ...Object.fromEntries(courses.map((course) => [course.id, course.title])),
  };
  const filtered = items
    .filter((assignment) => {
      const course = courses.find((item) => item.id === assignment.courseId);
      const matchesQuery = `${assignment.title} ${course?.title ?? ""}`
        .toLocaleLowerCase("id")
        .includes(query.trim().toLocaleLowerCase("id"));
      const pending = !assignment.submittedAt;
      const dueAt = Date.parse(assignment.dueAt);
      const matchesStatus =
        status === "all" || (status === "pending" ? pending : !pending);
      const matchesCourse =
        courseId === "all" || assignment.courseId === courseId;
      const matchesDays =
        days === "all" ||
        (days === "today" && getDeadlineDay(assignment.dueAt) === today) ||
        (days === "overdue" && pending && dueAt < currentTime) ||
        ((days === "week" || days === "month") &&
          dueAt >= currentTime &&
          dueAt <
            startOfToday + (days === "week" ? 7 : 30) * 24 * 60 * 60 * 1000);
      return matchesQuery && matchesStatus && matchesCourse && matchesDays;
    })
    .sort(
      (a, b) =>
        (Date.parse(a.dueAt) - Date.parse(b.dueAt)) *
        (sort === "ascending" ? 1 : -1),
    );
  const groups = new Map<string, Assignment[]>();
  for (const assignment of filtered) {
    const day = getDeadlineDay(assignment.dueAt);
    groups.set(day, [...(groups.get(day) ?? []), assignment]);
  }

  return (
    <section aria-labelledby="timeline-title" className="min-w-0">
      <Card>
        <CardHeader className="items-center">
          <CardTitle>
            <h2 id="timeline-title">{title}</h2>
          </CardTitle>
          <CardAction>
            {headerAction === undefined ? (
              <Link
                href="/calendar"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <CalendarDays data-icon="inline-start" />
                Kalender
              </Link>
            ) : (
              headerAction
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-2">
                <AssignmentFilter
                  label="Status tugas"
                  ariaLabel="Filter status tugas"
                  options={statusFilters}
                  value={status}
                  onValueChange={setStatus}
                />
                {showCourseFilter && (
                  <AssignmentFilter
                    label="Mata kuliah"
                    ariaLabel="Filter mata kuliah tugas"
                    options={courseFilters}
                    value={courseId}
                    onValueChange={setCourseId}
                  />
                )}
                <AssignmentFilter
                  label="Tenggat tugas"
                  ariaLabel="Filter hari tenggat tugas"
                  options={dayFilters}
                  value={days}
                  onValueChange={setDays}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Urutkan timeline tugas"
                      title="Urutkan timeline tugas"
                    />
                  }
                >
                  <ArrowDownWideNarrow />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Urutkan berdasarkan</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sort}
                      onValueChange={setSort}
                    >
                      <DropdownMenuRadioItem value="ascending" closeOnClick>
                        Tenggat terdekat
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="descending" closeOnClick>
                        Tenggat terjauh
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <InputGroup className="h-10 max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Cari tugas pada timeline"
                placeholder={
                  showCourseFilter
                    ? "Cari tugas atau mata kuliah..."
                    : "Cari tugas..."
                }
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Hapus pencarian tugas"
                    onClick={() => setQuery("")}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
          {filtered.length === 0 ? (
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyTitle>
                  {query.trim()
                    ? "Tugas tidak ditemukan"
                    : days === "overdue"
                      ? "Tidak ada tugas terlambat"
                      : "Tidak ada tugas untuk ditampilkan"}
                </EmptyTitle>
                <EmptyDescription>
                  {query.trim()
                    ? "Coba kata kunci lain."
                    : items.length === 0
                      ? emptyDescription
                      : "Pilih filter lain untuk melihat tugas lainnya."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul
              className="divide-y divide-border"
              aria-label="Tugas berdasarkan tenggat"
            >
              {[...groups].map(([day, items]) => (
                <li
                  key={day}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarDays
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <time dateTime={day}>
                      {formatDeadlineDay(items[0].dueAt)}
                    </time>
                  </h3>
                  <ul className="flex flex-col gap-5">
                    {items.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <time
                          dateTime={assignment.dueAt}
                          className="flex flex-col gap-1 text-sm tabular-nums text-muted-foreground"
                        >
                          <span>{formatDeadlineTime(assignment.dueAt)}</span>
                          <span className="text-xs">WIB</span>
                        </time>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Link
                            href={`/assignments/${assignment.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {assignment.title}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {
                              courses.find(
                                (course) => course.id === assignment.courseId,
                              )?.title
                            }
                          </span>
                          {assignment.submittedAt ? (
                            <Badge variant="secondary">Dikumpulkan</Badge>
                          ) : Date.parse(assignment.dueAt) < currentTime ? (
                            <Badge variant="destructive">Terlambat</Badge>
                          ) : null}
                        </div>
                        <Link
                          href={`/assignments/${assignment.id}`}
                          aria-label={`Lihat tugas ${assignment.title}`}
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className: "col-start-2 w-fit sm:col-start-auto",
                            }),
                          )}
                        >
                          Lihat tugas
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <span role="status" className="text-xs text-muted-foreground">
            {filtered.length} tugas ditampilkan
          </span>
          {showAllLink && (
            <Link
              href="/assignments"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Lihat semua tugas
              <ArrowRight data-icon="inline-end" />
            </Link>
          )}
        </CardFooter>
      </Card>
    </section>
  );
}

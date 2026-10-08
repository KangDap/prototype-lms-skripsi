"use client";

import { useState } from "react";
import { TZDate } from "react-day-picker";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssignmentTimeline } from "./assignment-timeline";
import { getDeadlineDay, LMS_TIME_ZONE } from "./assignment-dates";
import { assignments } from "./seed-data";

function calendarDate(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new TZDate(year, month - 1, date, LMS_TIME_ZONE);
}

export function AssignmentCalendar({ now }: { now: string }) {
  const today = getDeadlineDay(now);
  const [month, setMonth] = useState<Date>(() => calendarDate(today));
  const [selected, setSelected] = useState<Date | undefined>();
  const selectedDay = selected ? getDeadlineDay(selected) : undefined;
  const monthKey = getDeadlineDay(month).slice(0, 7);
  const visibleAssignments = assignments.filter((assignment) => {
    const day = getDeadlineDay(assignment.dueAt);
    return selectedDay ? day === selectedDay : day.startsWith(monthKey);
  });
  const deadlineDays = [
    ...new Set(
      assignments.map((assignment) => getDeadlineDay(assignment.dueAt)),
    ),
  ];
  const dayLabel = (date: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      timeZone: LMS_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: LMS_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Kalender</h1>
      </header>
      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="items-center gap-3">
            <CardTitle>
              <h2>Pilih tanggal</h2>
            </CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMonth(calendarDate(today));
                  setSelected(undefined);
                }}
              >
                Bulan ini
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              locale={id}
              timeZone={LMS_TIME_ZONE}
              weekStartsOn={1}
              today={calendarDate(today)}
              month={month}
              onMonthChange={(date) => {
                setMonth(date);
                setSelected(undefined);
              }}
              selected={selected}
              onSelect={(date) => {
                setSelected(date);
                if (date) setMonth(date);
              }}
              className="[--cell-size:2rem] min-[400px]:[--cell-size:2.25rem]"
              modifiers={{ deadline: deadlineDays.map(calendarDate) }}
              modifiersClassNames={{ deadline: "assignment-deadline" }}
              labels={{
                labelNext: () => "Bulan berikutnya",
                labelPrevious: () => "Bulan sebelumnya",
                labelDayButton: (date) => {
                  const count = assignments.filter(
                    (assignment) =>
                      getDeadlineDay(assignment.dueAt) === getDeadlineDay(date),
                  ).length;
                  return `${dayLabel(date)}${count ? `, ${count} tenggat tugas` : ""}`;
                },
              }}
            />
          </CardContent>
          {/* <CardFooter className="gap-2">
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground">
              Ada tenggat tugas
            </span>
          </CardFooter> */}
        </Card>
        <AssignmentTimeline
          now={now}
          items={visibleAssignments}
          initialStatus="all"
          emptyDescription={
            selected
              ? "Tidak ada tugas yang jatuh tempo pada tanggal ini."
              : "Tidak ada tugas yang jatuh tempo pada bulan ini."
          }
          title={
            selected ? "Tenggat tanggal terpilih" : `Tenggat ${monthLabel}`
          }
          headerAction={
            selected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(undefined)}
              >
                Lihat satu bulan
              </Button>
            ) : null
          }
        />
      </div>
    </>
  );
}

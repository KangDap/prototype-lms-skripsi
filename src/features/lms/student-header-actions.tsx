"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDeadline } from "./assignment-dates";
import { assignments, courses } from "./seed-data";

// Sample announcements for the prototype, using the existing assignment data.
const notificationAssignments = assignments.filter((assignment) => !assignment.submittedAt);

function Notifications() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const unreadCount = notificationAssignments.filter(
    (assignment) => !readIds.includes(assignment.id),
  ).length;

  function markRead(id: string) {
    setReadIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label={
                    unreadCount
                      ? `Notifikasi, ${unreadCount} belum dibaca`
                      : "Notifikasi"
                  }
                />
              }
            />
          }
        >
          <Bell aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              className="pointer-events-none absolute -top-1 -right-1"
              aria-hidden="true"
            >
              {unreadCount}
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>Notifikasi</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-w-[calc(100vw-2rem)]"
      >
        <PopoverHeader className="flex-row items-center justify-between gap-2 px-1 py-1">
          <PopoverTitle>Notifikasi</PopoverTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setReadIds(notificationAssignments.map((item) => item.id));
                toast.add({ type: "success", title: "Semua notifikasi ditandai dibaca" });
              }}
            >
              Tandai semua dibaca
            </Button>
          )}
        </PopoverHeader>
        <Separator />
        <ul className="flex max-h-[60vh] flex-col overflow-y-auto">
          {notificationAssignments.length === 0 && <li className="p-4 text-sm text-muted-foreground">Belum ada notifikasi.</li>}
          {notificationAssignments.map((assignment, index) => {
            const course = courses.find(
              (item) => item.id === assignment.courseId,
            );
            const unread = !readIds.includes(assignment.id);
            return (
              <Fragment key={assignment.id}>
                {index > 0 && (
                  <li aria-hidden="true">
                    <Separator />
                  </li>
                )}
                <li>
                  <Link
                    href={`/assignments/${assignment.id}`}
                    onClick={() => markRead(assignment.id)}
                    className="flex flex-col gap-1 rounded-md p-3 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {course?.title}
                      </span>
                      {unread && <Badge variant="secondary">Baru</Badge>}
                    </span>
                    <span className="font-medium">{assignment.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Batas waktu: {formatDeadline(assignment.dueAt)}
                    </span>
                  </Link>
                </li>
              </Fragment>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ubah tema"
            onClick={() => {
              const next = resolvedTheme === "dark" ? "light" : "dark";
              setTheme(next);
              toast.add({ id: "theme-status", type: "success", title: next === "dark" ? "Tema gelap diaktifkan" : "Tema terang diaktifkan" });
            }}
          />
        }
      >
        <Moon className="dark:hidden" aria-hidden="true" />
        <Sun className="hidden dark:block" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>
        <span className="dark:hidden">Gunakan tema gelap</span>
        <span className="hidden dark:inline">Gunakan tema terang</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function StudentHeaderActions({ showSecondaryWidgets = true }: { showSecondaryWidgets?: boolean }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <div hidden={!showSecondaryWidgets}><Notifications /></div>
    </div>
  );
}

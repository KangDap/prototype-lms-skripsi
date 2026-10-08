import type { Metadata } from "next";
import { AssignmentCalendar } from "@/features/lms/assignment-calendar";

export const metadata: Metadata = { title: "Kalender — Ruang Belajar" };
export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return <AssignmentCalendar now={new Date().toISOString()} />;
}

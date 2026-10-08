import type { Metadata } from "next";
import { AssignmentsView } from "@/features/lms/assignments-view";

export const metadata: Metadata = { title: "Tugas — Ruang Belajar" };
export const dynamic = "force-dynamic";

export default function AssignmentsPage() {
  return <AssignmentsView now={new Date().toISOString()} />;
}

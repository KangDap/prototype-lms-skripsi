import type { ReactNode } from "react";
import { StudentShell } from "@/features/lms/student-shell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell allowDebug={process.env.NODE_ENV === "development" && process.env.AUI_RESEARCH_MODE !== "true"}>{children}</StudentShell>;
}

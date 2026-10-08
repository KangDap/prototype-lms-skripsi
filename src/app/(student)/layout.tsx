import type { ReactNode } from "react";
import { StudentShell } from "@/features/lms/student-shell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}

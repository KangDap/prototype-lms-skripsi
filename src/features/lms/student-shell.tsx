"use client";

import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentSidebar } from "./student-sidebar";
import { StudentBreadcrumbs } from "./student-breadcrumbs";
import { StudentHeaderActions } from "./student-header-actions";

const StudentLmsContext = createContext<{
  savedIds: string[];
  toggleSaved: (id: string) => void;
} | null>(null);

export function useStudentLms() {
  const context = useContext(StudentLmsContext);
  if (!context)
    throw new Error("Student LMS components must be inside StudentShell.");
  return context;
}

function StudentHeader() {
  const { setOpenMobile } = useSidebar();
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-5 py-4 sm:px-8 lg:px-10">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Buka navigasi"
        onClick={() => setOpenMobile(true)}
      >
        <Menu />
      </Button>
      <Separator
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-auto md:hidden"
      />
      <div className="min-w-0 flex-1">
        <StudentBreadcrumbs />
      </div>
      <StudentHeaderActions />
    </header>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  function toggleSaved(id: string) {
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <StudentLmsContext.Provider value={{ savedIds, toggleSaved }}>
      <TooltipProvider delay={150}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "16rem",
              "--sidebar-width-icon": "4rem",
            } as CSSProperties
          }
        >
          <a href="#main-content" className="skip-link">
            Lewati ke konten utama
          </a>
          <StudentSidebar savedCount={savedIds.length} />
          <SidebarInset className="min-w-0">
            <StudentHeader />
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </StudentLmsContext.Provider>
  );
}

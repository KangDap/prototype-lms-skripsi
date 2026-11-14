"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
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
import { getAdaptiveUIConfig } from "../aui/config";
import type { AdaptiveUIConfig } from "../aui/types";
import { ResearchSessionProvider } from "../research/session-provider";
import { SessionSaveStatus } from "../research/save-status";
import { FaceIndicator } from "../fer/face-indicator";
import { ParticipantSessionGate } from "../research/session-gate";
import { ResearchWorkspace } from "../research/workspace";

const StudentLmsContext = createContext<{
  savedIds: string[];
  toggleSaved: (id: string) => void;
  adaptiveConfig: AdaptiveUIConfig;
  applyAdaptiveConfig: (config: AdaptiveUIConfig) => void;
} | null>(null);

export function useStudentLms() {
  const context = useContext(StudentLmsContext);
  if (!context)
    throw new Error("Student LMS components must be inside StudentShell.");
  return context;
}

function StudentHeader() {
  const { toggleSidebar } = useSidebar();
  const { adaptiveConfig } = useStudentLms();
  return (
    <header className="sticky top-0 z-40 flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b bg-background px-5 py-4 sm:px-8 lg:flex-nowrap lg:px-10">
      <Button
        variant="ghost"
        size="icon"
        className={adaptiveConfig.mode === "DEFAULT" ? "shrink-0 md:hidden" : "shrink-0"}
        aria-label="Buka navigasi"
        onClick={toggleSidebar}
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
      <FaceIndicator />
      <StudentHeaderActions showSecondaryWidgets={adaptiveConfig.showSecondaryWidgets} />
    </header>
  );
}

export function StudentShell({ children, allowDebug = false }: { children: ReactNode; allowDebug?: boolean }) {
  const pathname = usePathname();
  const researcherView = pathname === "/profile/settings";
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appearance, setAppearance] = useState({ config: getAdaptiveUIConfig("DEFAULT"), open: true, savedOpen: true });
  const applyAdaptiveConfig = useCallback((config: AdaptiveUIConfig) => {
    setAppearance((current) => {
      if (current.config.mode === config.mode) return current;
      const savedOpen = current.config.mode === "DEFAULT" ? current.open : current.savedOpen;
      return { config, savedOpen, open: config.sidebarCollapsed ? false : savedOpen };
    });
  }, []);

  function toggleSaved(id: string) {
    toast.add({ type: "success", title: savedIds.includes(id) ? "Bookmark course dihapus" : "Course ditambahkan ke bookmark" });
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <StudentLmsContext.Provider value={{ savedIds, toggleSaved, adaptiveConfig: appearance.config, applyAdaptiveConfig }}>
      <ResearchSessionProvider allowDebug={allowDebug}>
      <TooltipProvider delay={150}>
        {researcherView ? <ResearchWorkspace>{children}</ResearchWorkspace> :
        <SidebarProvider
          open={appearance.open}
          onOpenChange={(open) => setAppearance((current) => ({ ...current, open }))}
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
              className="mx-auto flex w-full max-w-[1440px] flex-1 scroll-mt-28 flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
            >
              <ParticipantSessionGate>{children}</ParticipantSessionGate>
              <SessionSaveStatus />
            </main>
          </SidebarInset>
        </SidebarProvider>}
      </TooltipProvider>
      </ResearchSessionProvider>
    </StudentLmsContext.Provider>
  );
}

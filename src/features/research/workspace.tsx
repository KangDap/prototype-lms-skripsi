"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function ResearchWorkspace({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh w-full min-w-0 flex-col bg-background">
    <a href="#research-main" className="skip-link">Lewati ke ruang peneliti</a>
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><GraduationCap className="size-6" aria-hidden="true" /><div><p className="font-semibold">Ruang Belajar</p><p className="text-xs text-muted-foreground">Ruang peneliti</p></div></div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>Kembali ke LMS</Link>
      </div>
    </header>
    <main id="research-main" tabIndex={-1} className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1 flex-col gap-6 px-5 py-8 sm:px-8">{children}</main>
  </div>;
}

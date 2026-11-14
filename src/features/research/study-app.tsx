"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useResearchSession } from "./session-provider";
import { materialPath, nextMaterial } from "./routing";

export { ACTIVE_STUDY_KEY } from "./routing";

/** Compatibility shortcut; participant activities live in the LMS material routes. */
export function StudyApp() {
  const { study, loading } = useResearchSession();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(study ? materialPath(nextMaterial(study).materialId) : "/dashboard");
  }, [study, loading, router]);
  return <p>Menyiapkan halaman pembelajaran…</p>;
}

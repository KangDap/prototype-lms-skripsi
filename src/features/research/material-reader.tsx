"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, List, PanelRightOpen } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { AdaptiveUIMode } from "../aui/types";
import type { ResearchMaterial } from "./content";
import { LessonSectionBody } from "./lesson-section-body";
import { ContextualHelp, type ReadingInteraction } from "./contextual-help";
import { ReadingPositionBoundary, captureReadingAnchor, restoreReadingAnchor } from "./reading-position";

type SavedReading = { active: string; visited: string[]; anchor: ReturnType<typeof captureReadingAnchor> };
export function MaterialReader({ material, mode = "DEFAULT", assisted = false, readingKey, onCloseAssistance, onInteraction }: {
  material: ResearchMaterial; mode?: AdaptiveUIMode; assisted?: boolean; readingKey?: string;
  onCloseAssistance?: () => void; onInteraction?: ReadingInteraction;
}) {
  const presentation = assisted ? "ASSISTED" : mode;
  const focused = presentation !== "DEFAULT";
  const [active, setActive] = useState("material-introduction");
  const [visited, setVisited] = useState<string[]>([]);
  const [manualHelp, setManualHelp] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const definition = useRef(material); definition.current = material;
  const current = useRef({ active, visited }); current.current = { active, visited };
  const interaction = useRef(onInteraction); interaction.current = onInteraction;
  const queuedNavigation = useRef<string | null>(null);
  const returnFromHelp = useRef<ReturnType<typeof captureReadingAnchor>>(null);
  const lastReadingAnchor = useRef<ReturnType<typeof captureReadingAnchor>>(null);
  const storageKey = readingKey ? `lms-reading-v2:${readingKey}` : null;
  const ids = ["material-introduction", ...material.sections.map((section) => section.id)];
  const index = Math.max(0, ids.indexOf(active));
  const section = material.sections.find((item) => item.id === active);
  const helpVisible = presentation === "ASSISTED" || manualHelp;
  const emit = useCallback((type: string, target: string, details: Record<string, unknown> = {}) => {
    interaction.current?.(type, target, { ...details, materialId: material.id });
  }, [material.id]);
  const selectSection = useCallback((id: string, reason: string) => {
    if (current.current.active !== id) emit("READING_SECTION_CHANGED", id, { previousSectionId: current.current.active, reason });
    current.current.active = id;
    setActive(id);
    setVisited((previous) => previous.includes(id) ? previous : [...previous, id]);
  }, [emit]);
  function navigate(id: string) {
    queuedNavigation.current = id; selectSection(id, "NAVIGATION"); setOutlineOpen(false);
    emit("OUTLINE_OPENED", id);
    // Runs even when the user selects the already active section.
    requestAnimationFrame(() => {
      const heading = document.getElementById(`${material.id}-${id}-heading`);
      heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: "start", behavior: "instant" });
      queuedNavigation.current = null;
    });
  }
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as SavedReading;
        if (["material-introduction", ...definition.current.sections.map((item) => item.id)].includes(saved.active)) {
          selectSection(saved.active, "RESTORE");
          lastReadingAnchor.current = saved.anchor;
          setVisited(Array.isArray(saved.visited) ? saved.visited.filter((id) => definition.current.sections.some((item) => item.id === id) || id === "material-introduction") : []);
          requestAnimationFrame(() => restoreReadingAnchor(saved.anchor));
        }
      }
    } catch { /* UI reading state is optional; research answers use the durable transport. */ }
    const save = () => {
      const anchor = captureReadingAnchor(root.current) ?? lastReadingAnchor.current;
      if (anchor) lastReadingAnchor.current = anchor;
      try { sessionStorage.setItem(storageKey, JSON.stringify({ ...current.current, anchor })); } catch { /* Research storage is unaffected. */ }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      lastReadingAnchor.current = captureReadingAnchor(root.current) ?? lastReadingAnchor.current;
      clearTimeout(timer); timer = setTimeout(save, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => { clearTimeout(timer); save(); window.removeEventListener("scroll", onScroll); window.removeEventListener("pagehide", save); };
  }, [storageKey, material.id, selectSection]);
  useEffect(() => {
    const scan = () => {
      if (queuedNavigation.current) return;
      const help = root.current?.querySelector<HTMLElement>("[data-contextual-panel]");
      const helpRect = help?.getBoundingClientRect();
      const railIsBelow = window.innerWidth < (presentation === "DEFAULT" ? 1024 : 1280);
      if (helpRect && helpRect.height && helpRect.top <= 150 && helpRect.bottom > 150 && railIsBelow) return;
      const sections = [...(root.current?.querySelectorAll<HTMLElement>("[data-reader-section]") ?? [])]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.height > 0);
      const visible = sections.find(({ rect }) => rect.top <= 150 && rect.bottom > 150)
        ?? sections.find(({ rect }) => rect.top > 0 && rect.top < window.innerHeight * 0.6);
      if (visible) selectSection(visible.element.dataset.readerSection!, "SCROLL");
    };
    let frame = 0;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; scan(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [selectSection, presentation]);
  useLayoutEffect(() => {
    emit("READING_PRESENTATION_CHANGED", current.current.active, { presentation, sectionBased: focused });
  }, [presentation, focused, emit]);
  const lastHelp = useRef<boolean | null>(null);
  const helpChangeReason = useRef<string | null>(null);
  useEffect(() => {
    if (lastHelp.current !== helpVisible) {
      if (helpVisible || lastHelp.current !== null) emit(helpVisible ? "CONTEXTUAL_PANEL_OPENED" : "CONTEXTUAL_PANEL_CLOSED", current.current.active, { presentation, access: helpVisible ? presentation === "ASSISTED" ? "ACCEPTED_ADAPTATION" : "MANUAL" : "CLOSED", reason: helpChangeReason.current ?? "MODE_CHANGE" });
      lastHelp.current = helpVisible;
      helpChangeReason.current = null;
    }
  }, [helpVisible, presentation, emit]);
  function closeHelp() {
    helpChangeReason.current = "USER_CLOSED";
    setManualHelp(false);
    if (presentation === "ASSISTED") onCloseAssistance?.();
    requestAnimationFrame(() => {
      restoreReadingAnchor(returnFromHelp.current); returnFromHelp.current = null;
      root.current?.querySelector<HTMLButtonElement>("[data-help-trigger]")?.focus({ preventScroll: true });
    });
  }
  function openHelp() {
    helpChangeReason.current = "USER_OPENED";
    returnFromHelp.current = captureReadingAnchor(root.current);
    setManualHelp(true);
    requestAnimationFrame(() => {
      const panel = root.current?.querySelector<HTMLElement>("[data-contextual-panel]");
      panel?.focus({ preventScroll: true });
      const wide = window.matchMedia(presentation === "DEFAULT" ? "(min-width: 1024px)" : "(min-width: 1280px)").matches;
      if (wide) { const rail = panel?.parentElement; if (rail && panel) rail.scrollTop = panel.offsetTop - rail.offsetTop; }
      else panel?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  const headingProps = (id: string) => ({ id: `${material.id}-${id}-heading`, tabIndex: -1, "data-reading-anchor": true });
  return <ReadingPositionBoundary layout={`${presentation}:${helpVisible}:${outlineOpen}`}>
    <div ref={root} className="flex min-w-0 flex-col gap-5" data-reading-mode={presentation}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{presentation === "DEFAULT" ? "Tampilan standar" : presentation === "FOCUS" ? "Baca fokus" : "Bantuan belajar"}</Badge><span className="text-xs text-muted-foreground">{index ? `Bagian ${index} dari ${material.sections.length}` : "Pengantar"}</span></div>
          <p className="text-sm font-medium">{section?.title ?? "Pengantar dan tujuan pembelajaran"}</p>
          <p className="text-xs text-muted-foreground">{visited.filter((id) => id !== "material-introduction").length} dari {material.sections.length} subbab pernah dibuka</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {focused && <Button type="button" size="sm" variant="outline" aria-expanded={outlineOpen} onClick={() => setOutlineOpen(!outlineOpen)}><List data-icon="inline-start" />Daftar bagian</Button>}
          <Button data-help-trigger type="button" size="sm" variant="outline" onClick={openHelp}><PanelRightOpen data-icon="inline-start" />{helpVisible ? "Lihat bantuan" : "Bantuan bagian ini"}</Button>
        </div>
      </div>
      {focused && outlineOpen && <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-medium">Daftar bagian</h3>
        <nav aria-label="Daftar bagian pada tampilan fokus" className="flex flex-wrap gap-2">{ids.map((id, i) => <Button key={id} type="button" variant={active === id ? "secondary" : "outline"} className="h-auto whitespace-normal text-left" aria-current={active === id ? "location" : undefined} onClick={() => navigate(id)}>{i ? material.sections[i - 1].title : "Pengantar"}</Button>)}</nav>
        <details className="mt-4" onToggle={(event) => { if (event.currentTarget.open) emit("GLOSSARY_EXPANDED", material.id); }}><summary className="cursor-pointer text-sm font-medium">Glosarium lengkap</summary><dl className="mt-4 flex flex-col gap-3 text-sm">{material.glossary.map((item) => <div key={item.term}><dt className="font-medium">{item.term}</dt><dd className="leading-6 text-muted-foreground">{item.definition}</dd></div>)}</dl></details>
      </div>}
      <div className={cn("grid min-w-0 items-start gap-6", presentation === "DEFAULT" && "lg:grid-cols-[minmax(0,1fr)_18rem]", focused && helpVisible && "xl:grid-cols-[minmax(0,1fr)_21rem]")}>
        <article aria-label={material.title} className={cn("min-w-0 rounded-xl border bg-card p-5 sm:p-8", focused && "mx-auto w-full max-w-[76ch]")}>
          <section data-reader-section="material-introduction" data-reader-active={active === "material-introduction"} hidden={focused && active !== "material-introduction"} className="flex flex-col gap-5">
            <h2 {...headingProps("material-introduction")} className="scroll-mt-28 text-2xl font-semibold tracking-tight">Pengantar</h2>
            <p id={`${material.id}-intro-text`} data-reading-anchor className="text-base leading-8">{material.introduction}</p>
            <ul className="flex list-disc flex-col gap-2 pl-6 leading-7">{material.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="text-sm leading-6 text-muted-foreground">Perkiraan belajar 15–20 menit, termasuk membaca diagram dan memikirkan pertanyaan refleksi. Pertanyaan refleksi tidak perlu dikirim.</p>
          </section>
          {material.sections.map((item) => <section key={item.id} data-reader-section={item.id} data-reader-active={active === item.id} hidden={focused && active !== item.id} className={cn("flex flex-col gap-6", !focused && "mt-10 border-t pt-8")}>
            <h2 {...headingProps(item.id)} className="scroll-mt-28 text-2xl font-semibold tracking-tight leading-snug">{item.title}</h2>
            <p className="text-xs text-muted-foreground">Perkiraan {item.minutes} menit</p>
            <LessonSectionBody material={material} section={item} onTermOpen={(term) => emit("TOOLTIP_OPENED", item.id, { term })} />
            <aside id={`${material.id}-${item.id}-reflection`} data-reading-anchor className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-5"><h3 className="text-sm font-semibold">Pikirkan sejenak</h3><p className="text-sm leading-7">{item.reflection}</p></aside>
          </section>)}
          <Separator className="my-6" />
          <nav aria-label="Navigasi bagian materi" className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" disabled={index === 0} onClick={() => navigate(ids[index - 1])}><ArrowLeft data-icon="inline-start" />Sebelumnya</Button>
            <span className="text-xs text-muted-foreground">{index ? `${index} / ${material.sections.length}` : "Pengantar"}</span>
            <Button type="button" variant="outline" disabled={index === ids.length - 1} onClick={() => navigate(ids[index + 1])}>Berikutnya<ArrowRight data-icon="inline-end" /></Button>
          </nav>
        </article>
        <aside hidden={focused && !helpVisible} aria-label="Navigasi dan bantuan materi" className={cn("flex min-w-0 flex-col gap-5", presentation === "DEFAULT" ? "lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" : "xl:sticky xl:top-28 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto")}>
          <div hidden={focused}>
          <Card>
            <CardHeader><CardTitle>Daftar bagian</CardTitle><CardDescription>Seluruh subbab dan istilah selalu tersedia.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-5">
              <nav aria-label="Daftar subbab"><ol className="flex flex-col gap-2">{ids.map((id, i) => <li key={id}><Button type="button" variant={active === id ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal text-left" aria-current={active === id ? "location" : undefined} onClick={() => navigate(id)}>{i === 0 ? "Pengantar" : material.sections[i - 1].title}</Button></li>)}</ol></nav>
              <details onToggle={(event) => { if (event.currentTarget.open) emit("GLOSSARY_EXPANDED", material.id); }}><summary className="cursor-pointer text-sm font-medium">Glosarium lengkap</summary><dl className="mt-4 flex flex-col gap-4 text-sm">{material.glossary.map((item) => <div key={item.term}><dt className="font-medium">{item.term}</dt><dd className="mt-1 leading-6 text-muted-foreground">{item.definition}</dd></div>)}</dl></details>
            </CardContent>
          </Card>
          </div>
          <div data-contextual-panel tabIndex={-1} hidden={!helpVisible} aria-label="Panel bantuan kontekstual" className="scroll-mt-28">
            <ContextualHelp material={material} section={section} onClose={closeHelp} onInteraction={emit} />
          </div>
        </aside>
      </div>
      <details className="rounded-xl border p-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-medium"><BookOpen className="size-4" aria-hidden="true" />Referensi penyusunan materi</summary><div className="mt-4 flex flex-col gap-3 text-sm leading-6"><p>Materi dan ilustrasi disusun untuk prototipe penelitian dengan merujuk OpenStax, Introductory Statistics 2e. Contoh kampus dan angka ilustratif bukan laporan data nyata.</p><ul className="flex flex-col gap-2">{material.references.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{reference.title}</a></li>)}</ul></div></details>
    </div>
  </ReadingPositionBoundary>;
}

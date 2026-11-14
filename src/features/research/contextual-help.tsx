"use client";

import { BookOpen, ChevronDown, FlaskConical, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { ContentSection, ResearchMaterial } from "./content";

export type ReadingInteraction = (type: string, target: string, details?: Record<string, unknown>) => void;

export function ContextualHelp({ material, section, onClose, onInteraction }: {
  material: ResearchMaterial; section?: ContentSection; onClose: () => void; onInteraction?: ReadingInteraction;
}) {
  const support = section?.support;
  const terms = section ? material.glossary.filter((item) => support?.terms.includes(item.term)) : material.glossary;
  const target = section?.id ?? "material-introduction";
  const groups = [
    { id: "terms", title: "Istilah terkait", icon: BookOpen,
      content: <dl className="flex flex-col gap-4">{terms.map((item) => <div key={item.term}><dt className="font-medium">{item.term}</dt><dd className="mt-1 leading-6 text-muted-foreground">{item.definition}</dd></div>)}{!terms.length && <p>Definisi bagian ini belum tersedia pada versi sesi ini.</p>}</dl> },
    { id: "example", title: "Contoh relevan", icon: FlaskConical,
      content: <p className="leading-7">{section ? support?.example ?? "Contoh bantuan belum tersedia pada versi sesi ini; contoh asli tetap dapat dibaca dalam materi." : material.introduction}</p> },
    { id: "summary", title: "Ringkasan", icon: ListChecks,
      content: <ul className="flex list-disc flex-col gap-2 pl-5 leading-7">{(section ? support?.summary ?? [] : material.objectives).map((point) => <li key={point}>{point}</li>)}{section && !support && <li>Ringkasan belum tersedia pada versi sesi ini.</li>}</ul> },
  ];
  return <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Bantuan bagian ini</CardTitle>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Tutup bantuan bagian ini" onClick={onClose}><X data-icon="inline-start" /></Button>
      </div>
      <CardDescription>{section?.title ?? "Pengantar dan tujuan pembelajaran"}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {groups.map(({ id, title, icon: Icon, content }) => <details key={id} className="group rounded-lg border p-3" onToggle={(event) => onInteraction?.("CONTEXTUAL_HELP_TOGGLED", target, { category: id, open: event.currentTarget.open })}>
        <summary className="flex cursor-pointer items-center gap-2 py-1 font-medium"><Icon className="size-4 shrink-0" aria-hidden="true" />{title}<ChevronDown className="ml-auto size-4 shrink-0 group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="pt-4 text-sm">{content}</div>
      </details>)}
    </CardContent>
  </Card>;
}

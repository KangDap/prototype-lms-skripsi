"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResearchMaterial } from "./content";
function LearningTerm({ text, definition, onOpen }: { text: string; definition: string; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={(next) => { setOpen(next); if (next) onOpen(); }}>
    <TooltipTrigger render={<button type="button" className="inline rounded-sm bg-accent/40 px-0.5 text-primary underline decoration-dashed decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Arti istilah ${text}`} aria-expanded={open} onClick={() => { if (!open) onOpen(); setOpen(!open); }} />}>
      {text}<span aria-hidden="true" className="ml-0.5 align-super text-[0.65em]">?</span>
    </TooltipTrigger>
    <TooltipContent className="max-w-64 leading-5">{definition}</TooltipContent>
  </Tooltip>;
}
export function LearningTerms({ text, glossary, onOpen }: { text: string; glossary: ResearchMaterial["glossary"]; onOpen: (term: string) => void }) {
  const escaped = glossary.map((item) => item.term).sort((a, b) => b.length - a.length).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const parts = text.split(new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"));
  return <>{parts.map((part, index) => {
    const item = glossary.find((entry) => entry.term.toLowerCase() === part.toLowerCase());
    return item ? <LearningTerm key={index} text={part} definition={item.definition} onOpen={() => onOpen(item.term)} /> : part;
  })}</>;
}

"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResearchMaterial } from "./content";
function LearningTerm({ text, definition, onOpen }: { text: string; definition: string; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={(next) => { setOpen(next); if (next) onOpen(); }}>
    <TooltipTrigger render={<button type="button" className="inline rounded-sm text-learning-term underline decoration-learning-term/50 decoration-dashed decoration-1 underline-offset-4 hover:decoration-learning-term focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Arti istilah ${text}`} aria-expanded={open} onClick={() => { if (!open) onOpen(); setOpen(!open); }} />}>
      {text}<span aria-hidden="true" className="ml-0.5 align-super text-[0.65em]">?</span>
    </TooltipTrigger>
    <TooltipContent className="max-w-64 leading-5">{definition}</TooltipContent>
  </Tooltip>;
}
export function LearningTerms({ text, precedingText = "", glossary, onOpen }: { text: string; precedingText?: string; glossary: ResearchMaterial["glossary"]; onOpen: (term: string) => void }) {
  const escaped = glossary.map((item) => item.term).sort((a, b) => b.length - a.length).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const parts = text.split(new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"));
  // Derive occurrences from content on every render, never from mutable component
  // state: hidden sections, mode switches and rerenders keep the same tooltips.
  const seen = new Set(precedingText.split(new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"))
    .filter((_, index) => index % 2 === 1).map((term) => term.toLowerCase()));
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return part;
    const key = part.toLowerCase();
    const item = glossary.find((entry) => entry.term.toLowerCase() === key);
    if (seen.has(key)) return part;
    seen.add(key);
    return item ? <LearningTerm key={index} text={part} definition={item.definition} onOpen={() => onOpen(item.term)} /> : part;
  })}</>;
}

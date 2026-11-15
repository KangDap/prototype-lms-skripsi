"use client";
import { Fragment } from "react";
import Image from "next/image";
import type { ContentSection, ResearchMaterial } from "./content";
import { MaterialDiagram } from "./material-diagram";
import { LearningTerms } from "./learning-terms";

/** Shared by every presentation and condition; legacy snapshots retain their diagrams. */
export function LessonSectionBody({ material, section, onTermOpen }: {
  material: ResearchMaterial; section: ContentSection; onTermOpen: (term: string) => void;
}) {
  const prefix = `${material.id}-${section.id}`;
  return <>
    {section.paragraphs.map((paragraph, paragraphIndex) => <Fragment key={paragraphIndex}>
      <p id={`${prefix}-paragraph-${paragraphIndex}`} data-reading-anchor className="text-justify text-base leading-8">
        <LearningTerms text={paragraph} precedingText={section.paragraphs.slice(0, paragraphIndex).join("\n")} glossary={material.glossary} onOpen={onTermOpen} />
      </p>
      {section.tables?.filter((table) => table.afterParagraph === paragraphIndex).map((table) => <div key={table.id} id={`${prefix}-table-${table.id}`} data-reading-anchor className="min-w-0 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm leading-6">
          <caption className="px-4 py-3 text-left text-sm text-muted-foreground">{table.caption}</caption>
          <thead className="border-y bg-muted/30"><tr>{table.columns.map((column) => <th key={column} scope="col" className="px-4 py-3 align-top font-medium">{column}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b last:border-0">
            {row.map((value, columnIndex) => columnIndex === 0
              ? <th key={columnIndex} scope="row" className="px-4 py-3 align-top font-medium">{value}</th>
              : <td key={columnIndex} className="px-4 py-3 align-top">{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>)}
      {section.figure?.afterParagraph === paragraphIndex && <figure id={`${prefix}-diagram`} data-reading-anchor className="flex min-w-0 flex-col gap-3">
        <Image src={section.figure.src} alt={section.figure.alt} width={section.figure.width} height={section.figure.height}
          unoptimized className="h-auto w-full rounded-lg" />
        <figcaption className="text-sm leading-6 text-muted-foreground">{section.figure.caption}</figcaption>
      </figure>}
    </Fragment>)}
    {!section.figure && section.diagram && <div id={`${prefix}-diagram`} data-reading-anchor><MaterialDiagram kind={section.diagram} /></div>}
  </>;
}

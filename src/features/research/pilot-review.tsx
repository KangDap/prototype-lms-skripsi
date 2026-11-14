"use client";
import { Button } from "@/components/ui/button";
import { useResearchSession } from "./session-provider";
import { CLT_ENGLISH, CLT_BILINGUAL_VERSION } from "./clt-bilingual";
import type { CanonicalCLTItemId } from "./clt";
export function PilotReview() {
  const { study } = useResearchSession();
  if (!study || study.kind === "MAIN" || study.status !== "COMPLETED") return <p>Bahan ini tersedia khusus TEST/PILOT setelah kedua sesi pembelajaran selesai. Hubungi peneliti untuk peninjauan.</p>;
  return <section className="flex flex-col gap-5">
    <h1 className="text-2xl font-semibold">Peninjauan bahasa kuesioner · Pilot</h1>
    <p className="text-sm leading-7">Peserta {study.participantId} · Instrumen {study.questionnaire.version} · Bahan {CLT_BILINGUAL_VERSION}. Bandingkan makna kedua bahasa. Sampaikan kepada peneliti: bagian yang sulit dipahami, perbedaan makna, dan saran redaksi. Ini bahan peninjauan terjemahan; tidak dihitung sebagai skor CLT dan tidak mengubah jawaban utama.</p>
    <p className="text-sm">Terjemahan Indonesia masih draf. Peneliti mencatat masukan pada lembar terpisah. Setelah peninjauan selesai, beri tahu peneliti.</p>
    <Button className="w-fit print:hidden" variant="outline" onClick={() => window.print()}>Cetak bahan peninjauan</Button>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Pasangan redaksi Table 11 Inggris dan draf Indonesia</caption><thead><tr><th scope="col" className="p-3">Kode</th><th scope="col" className="p-3">English</th><th scope="col" className="p-3">Bahasa Indonesia · draf</th></tr></thead><tbody>{study.questionnaire.items.map((item) => <tr key={item.id} className="border-t"><th scope="row" className="p-3 align-top">{item.sourceLabel}</th><td lang="en" className="p-3 align-top leading-7">{CLT_ENGLISH[item.sourceLabel as CanonicalCLTItemId] ?? "Periksa kode sumber pada instrumen lama"}</td><td className="p-3 align-top leading-7">{item.text}</td></tr>)}</tbody></table></div>
    <p className="text-xs leading-6 text-muted-foreground">Sumber teks Inggris: Krieglstein, Beege, Rey, Sanchez-Stockhammer & Schneider (2023), Table 11, hlm. 28. <a href="https://doi.org/10.1007/s10648-023-09738-0" className="underline" target="_blank" rel="noreferrer">DOI artikel</a>. Lisensi <a href="https://creativecommons.org/licenses/by/4.0/" className="underline" target="_blank" rel="noreferrer">CC BY 4.0</a>. Teks Inggris dipertahankan; draf Indonesia disediakan peneliti dan belum diklaim tervalidasi.</p>
  </section>;
}

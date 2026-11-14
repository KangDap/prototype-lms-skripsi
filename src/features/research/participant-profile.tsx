"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useResearchSession } from "./session-provider";
export function ParticipantProfile() {
  const { study, loading } = useResearchSession();
  return <Card className="max-w-2xl">
    <CardHeader className="flex flex-row items-center gap-4">
      <Avatar size="lg"><AvatarFallback>{study?.participantId.slice(0, 2) ?? "—"}</AvatarFallback></Avatar>
      <div className="flex flex-col gap-1"><CardTitle>{loading ? "Memuat identitas…" : study?.participantId ?? "Belum ada sesi aktif"}</CardTitle><CardDescription>Identitas berkode untuk penelitian</CardDescription></div>
    </CardHeader>
    <CardContent><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Kode peserta</dt><dd>{study?.participantId ?? "Belum tersedia"}</dd></div><div><dt className="text-muted-foreground">Kode PC</dt><dd>{study?.stationId ?? "Belum tersedia"}</dd></div></dl></CardContent>
  </Card>;
}

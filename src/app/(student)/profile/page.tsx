import type { Metadata } from "next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { student } from "@/features/lms/seed-data";

export const metadata: Metadata = { title: "Profil — Ruang Belajar" };

export default function ProfilePage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback>{student.initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>
              <h2>{student.name}</h2>
            </CardTitle>
            <CardDescription>Mahasiswa</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{student.email}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground">Program studi</dt>
              <dd>{student.program}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}

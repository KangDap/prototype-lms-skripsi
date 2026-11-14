import type { Metadata } from "next";
import { ParticipantProfile } from "@/features/research/participant-profile";
export const metadata: Metadata = { title: "Profil — Ruang Belajar" };
export default function ProfilePage() {
  return <><h1 className="text-3xl font-semibold tracking-tight">Profil</h1><ParticipantProfile /></>;
}

import { redirect } from "next/navigation";
export const metadata = { title: "Pengaturan penelitian — Ruang Belajar" };
export default function ResearchPage() { redirect("/profile/settings"); }

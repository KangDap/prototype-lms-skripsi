import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function StudentNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">
        Mata kuliah atau materi ini tidak tersedia.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline" })}
      >
        Kembali ke dashboard
      </Link>
    </div>
  );
}

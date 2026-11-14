"use client";
import { useEffect } from "react";
import { BookOpen, Focus, SlidersHorizontal } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdaptiveUI } from "./adaptive-provider";

export function AdaptationOffer() {
  const { session, snapshot } = useAdaptiveUI();
  const open = snapshot.engine.assistanceOffered && session.condition === "ADAPTIVE";
  useEffect(() => { if (open) session.markOfferPresented(performance.now()); }, [open, snapshot.engine.offerOpenedAt, session]);
  return <AlertDialog open={open} onOpenChange={(next) => {
    if (!next && session.getSnapshot().engine.assistanceOffered) session.manual("CLOSE_ADAPTATION", performance.now());
  }}>
    <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-xl">
      <AlertDialogHeader>
        <AlertDialogMedia><SlidersHorizontal aria-hidden="true" /></AlertDialogMedia>
        <AlertDialogTitle>Sesuaikan Tampilan Belajar</AlertDialogTitle>
        <AlertDialogDescription>
          Sistem mendeteksi pola ekspresi wajah tertentu selama pembelajaran dan menawarkan penyesuaian tampilan.
          Apakah Anda ingin menyesuaikan tampilan belajar?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <AlertDialogAction type="button" variant="outline" className="h-auto min-w-0 items-start justify-start gap-3 whitespace-normal p-4 text-left" onClick={() => {
          session.manual("SELECT_FOCUS", performance.now());
          toast.add({ type: "info", title: "Tampilan fokus diaktifkan" });
        }}>
          <Focus data-icon="inline-start" aria-hidden="true" />
          <span className="flex min-w-0 flex-col gap-1.5"><span>Bantu Saya Fokus</span><span className="text-xs font-normal leading-5 text-muted-foreground">Sederhanakan tampilan agar lebih nyaman membaca materi.</span></span>
        </AlertDialogAction>
        <AlertDialogAction type="button" variant="outline" className="h-auto min-w-0 items-start justify-start gap-3 whitespace-normal p-4 text-left" onClick={() => {
          session.manual("SELECT_ASSISTED", performance.now());
          toast.add({ type: "info", title: "Bantuan materi ditampilkan" });
        }}>
          <BookOpen data-icon="inline-start" aria-hidden="true" />
          <span className="flex min-w-0 flex-col gap-1.5"><span>Tampilkan Bantuan Materi</span><span className="text-xs font-normal leading-5 text-muted-foreground">Lihat istilah, contoh, dan ringkasan yang relevan.</span></span>
        </AlertDialogAction>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Prediksi ekspresi merupakan perkiraan model dan tidak selalu mencerminkan emosi atau tingkat pemahaman Anda. Anda bebas mempertahankan tampilan saat ini.</p>
      <AlertDialogFooter>
        <AlertDialogCancel type="button" className="h-auto w-full whitespace-normal py-2.5" onClick={() => {
          session.manual("DECLINE_ADAPTATION", performance.now());
          toast.add({ type: "info", title: "Tampilan saat ini dipertahankan" });
        }}>Tidak, Lanjutkan Seperti Biasa</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

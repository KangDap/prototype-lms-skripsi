"use client";

import { useRef } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ActionConfirmation({ open, onOpenChange, title, description, confirmLabel = "Ya, kirim", busy = false, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  confirmLabel?: string; busy?: boolean; onConfirm: () => void;
}) {
  const confirmed = useRef(false);
  return <AlertDialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }} onOpenChangeComplete={(next) => { if (!next) confirmed.current = false; }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel type="button" disabled={busy}>Periksa kembali</AlertDialogCancel>
        <AlertDialogAction type="button" disabled={busy} onClick={() => {
          if (busy || confirmed.current) return;
          confirmed.current = true;
          onOpenChange(false);
          onConfirm();
        }}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

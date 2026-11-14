"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useResearchSession } from "./session-provider";
export const PARTICIPANT_PROTOCOL_VERSION = "participant-guide-id-1";
export function ParticipantProtocol({ requireAcknowledgement = false }: { requireAcknowledgement?: boolean }) {
  const { study, busy, command, error } = useResearchSession();
  return <Card className="mx-auto max-w-3xl">
    <CardHeader><CardTitle>Panduan kegiatan pembelajaran</CardTitle><CardDescription>Peserta {study?.participantId ?? "belum tersedia"} · PC {study?.stationId ?? "belum tersedia"}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-5 text-sm leading-7">
      <p>Anda akan mempelajari dua materi melalui LMS. Baca dan jawab secara mandiri sesuai pengetahuan serta pengalaman Anda.</p>
      <ol className="list-decimal pl-5">
        <li>Buka Mata kuliah, pilih Literasi dan Interpretasi Data, kemudian materi yang tersedia. Materi berikutnya terbuka setelah materi pertama selesai.</li>
        <li>Jawab delapan soal pengetahuan awal. Pilih satu jawaban A–E untuk setiap soal, kemudian kirim.</li>
        <li>Pelajari seluruh subbab, diagram, dan contoh. Anda dapat membuka istilah bergaris bawah untuk melihat penjelasan. Setelah selesai, tekan Selesai belajar.</li>
        <li>Jawab delapan soal pemahaman setelah belajar, kemudian kirim.</li>
        <li>Isi kuesioner pengalaman belajar: tiga bagian, masing-masing lima pernyataan. Pilih nilai 1–9 sesuai pengalaman, lalu kirim setelah seluruhnya terisi.</li>
        <li>Anda kembali ke halaman course. Buka materi kedua dan ulangi urutan yang sama. Kegiatan selesai setelah kedua materi berstatus selesai; beri tahu peneliti.</li>
      </ol>
      <p>Kamera aktif hanya selama membaca materi. Izinkan akses kamera saat browser memintanya dan pastikan satu wajah berada dalam bingkai. Label ekspresi dan confidence adalah perkiraan model, bukan kepastian emosi atau pemahaman. Foto dan video wajah tidak disimpan.</p>
      <p>Jika ada tawaran penyesuaian tampilan, Anda bebas memilih Fokus, Bantuan Materi, atau mempertahankan tampilan. Anda juga dapat kembali ke tampilan normal melalui tombol yang tersedia. Tawaran mungkin tidak muncul selama pembelajaran.</p>
      <p>Jika penyimpanan gagal, jangan tutup tab. Gunakan Coba simpan kembali dan hubungi peneliti. Jika kamera gagal, periksa izin lalu pilih Coba kamera lagi. Jika aplikasi berhenti merespons atau perlu menghentikan kegiatan, hubungi peneliti. Hindari membuka beberapa tab sesi bersamaan.</p>
      <p>Periksa jawaban sebelum menyetujui pengiriman. Hasil dan kunci tes tidak ditampilkan selama kegiatan. Jika ada hal yang tidak jelas, tanyakan kepada peneliti.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </CardContent>
    <CardFooter className="flex flex-wrap gap-3">{requireAcknowledgement ? <Button disabled={busy} onClick={() => void command("ACK_PROTOCOL")}>{busy ? "Menyimpan…" : "Saya sudah membaca, lanjut ke LMS"}</Button> : <Button render={<Link href="/dashboard" />}>Kembali ke dashboard</Button>}
      {study?.kind !== "MAIN" && study?.status === "COMPLETED" && <Button variant="outline" render={<Link href="/pilot-review" />}>Tinjau bahasa CLT · Pilot</Button>}
    </CardFooter>
  </Card>;
}

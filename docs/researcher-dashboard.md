# Dashboard peneliti

Pembaruan 14 November: ringkasan membaca event tawaran/pilihan AUI baru (FOCUS/ASSISTED/TIDAK, ditutup, diabaikan). Ruang peneliti menyediakan ekspor **AUI-EVENTS** untuk detail tiap event. Lihat [laporan revisi](revision-2026-11-14.md). Revisi ini belum dijalankan atau diuji; catatan tes versi terdahulu tidak berlaku sebagai bukti validasi versi ini.

Halaman `/profile/settings` sekarang merupakan ruang peneliti tanpa sidebar mahasiswa. Akses melalui menu profil **Ruang peneliti** atau ikon pengaturan pada halaman masuk, lalu masukkan password `RESEARCHER_KEY` yang sudah digunakan sebelumnya.

## Isi tampilan

- **Dashboard hasil**: jumlah sesi, status selesai/berjalan/belum lengkap, jumlah pasangan lengkap, rata-rata ICL/ECL/GCL per kondisi, perbandingan ECL, dan hasil pretest/posttest.
- **Pengaturan & responden**: konfigurasi alokasi, status kesiapan, pembuatan/pemulihan/pengakhiran sesi, serta ekspor yang sebelumnya tersedia. Draf pengaturan dipertahankan ketika berpindah tab selama ruang peneliti masih terbuka.
- **Lihat hasil** pada baris peserta: skor setiap blok, durasi dan waktu pengiriman CLT, jawaban final 15 butir, serta ringkasan log FER/AUI. Sumber REAL dan SIMULATION ditampilkan terpisah.

Dashboard membaca berkas sesi `.json` dari `.research-data` atau `RESEARCH_DATA_DIR` yang sudah dikonfigurasi. Rincian log membaca `.events.jsonl` melalui fungsi penyimpanan yang sama. Tidak ada database, data contoh, migrasi hasil, atau perubahan cara penghitungan skor CLT.

Data yang tampil adalah hasil pada **instance LMS/PC ini**. Data PC lab lain belum tersinkron otomatis. Gunakan ekspor/penggabungan yang sudah tersedia untuk analisis semua PC; jangan menyalin ekspor JSON ke folder record runtime karena format keduanya berbeda.

## Pembaruan dan filter

Data dibaca setiap sekitar 15 detik saat tab browser terlihat, atau melalui **Perbarui hasil**. Jawaban yang masih berada dalam antrean browser dan belum diakui server tidak ikut ringkasan. Waktu terakhir dibaca ditampilkan; bila pembacaan gagal, data terakhir tetap ditampilkan bersama pesan kegagalan.

Jenis sesi MAIN/PILOT/TEST dipisahkan. Pilihan awal menggunakan MAIN jika tersedia, kemudian PILOT, lalu TEST. Versi dipilih berdasarkan kombinasi snapshot aplikasi, materi, soal, instrumen, metodologi, alur, dan konfigurasi AUI; kombinasi berbeda tidak digabung menjadi satu rata-rata. ID versi pendek membantu membedakan kombinasi yang labelnya mirip. Pencarian kode peserta/PC turut membatasi sesi yang masuk ringkasan.

## Aturan angka

- Nilai per sesi memakai skor dimensi yang sudah tersimpan. ICL, ECL, dan GCL tidak dijumlahkan menjadi satu skor.
- Baris sesi dapat menampilkan satu blok yang sudah mempunyai jawaban CLT meskipun sesi keseluruhan belum selesai.
- Rata-rata per kondisi dan selisih ECL hanya memakai sesi COMPLETED dengan dua kondisi, kedua blok selesai, 15 jawaban CLT final yang valid, serta pretest/posttest tersedia.
- Selisih ECL adalah rata-rata selisih **Adaptive − Non-Adaptive** pada sesi berpasangan yang sama. Angka negatif berarti lebih rendah secara deskriptif; dashboard tidak menghitung uji signifikansi atau menyimpulkan efektivitas.
- Skor tes diringkas sebagai rata-rata persentase jawaban benar per blok. Rincian menampilkan jumlah benar/jumlah soal yang tersimpan.
- Jawaban CLT SIMULATION tidak masuk ringkasan secara default. Checkbox pada TEST dapat menyertakannya untuk pemeriksaan teknis. Data berlabel SIMULATION tetap terlihat pada daftar/rincian. Label UNSPECIFIED_LEGACY berarti versi lama belum menyimpan penanda sumber jawaban.
- Bila satu kode peserta memiliki beberapa sesi pada jenis/versi yang sama, semua sesi tetap tampil tetapi kode itu dikeluarkan dari ringkasan pasangan. Pencarian tidak menghilangkan pemeriksaan duplikasi tersebut. Pemilihan sesi yang sah memerlukan peninjauan peneliti.
- Tanda **—** berarti nilai belum tersedia; data kosong tidak diubah nol. Angka nol pada hitungan log berarti tidak ada event jenis tersebut yang ditemukan pada log tersimpan.
- Durasi DEFAULT/FOCUS/ASSISTED berasal dari MINUTE_SUMMARY, termasuk ringkasan parsial. Ini durasi mode pada tab terlihat yang sudah tercatat, bukan waktu perhatian peserta atau ukuran cognitive load. FER tidak digunakan menghitung skor CLT.

## Akses dan batasan

Endpoint `/api/research/results` dan rincian `?id=...` mewajibkan akses peneliti sebelum membaca data. Proyeksi dashboard tidak mengirim token akses, hash token, atau kunci jawaban tes. Respons API peserta tetap tidak membawa skor dimensi maupun kunci tes. Keluar dari ruang peneliti tetap mengunci akses seperti sebelumnya.

Dashboard ini bersifat deskriptif, belum melakukan penggabungan otomatis antarkomputer atau pengujian statistik. Pembacaan banyak sesi dan hashing snapshot dilakukan pada server lokal; ukuran dataset besar perlu ditinjau kinerjanya pada PC lab. Versi aplikasi pembelajaran tidak dinaikkan karena penambahan ini hanya pada ruang peneliti, sehingga tidak memisahkan hasil dengan perlakuan belajar yang sama.

## Pemeriksaan manual oleh peneliti

Implementasi ini belum dijalankan melalui aplikasi, build, lint, typecheck, atau tes otomatis oleh asisten sesuai instruksi sebelumnya.

1. Buka ruang peneliti, masukkan password, dan pastikan sidebar mahasiswa tidak tampil, termasuk pada halaman password.
2. Pilih TEST bila hasil yang sudah ada merupakan sesi uji coba. Pilih versi yang sesuai; periksa baris berjalan dan selesai.
3. Bandingkan skor per sesi dan jawaban per butir dengan ekspor JSON/CSV dari sesi yang sama. Periksa angka 0 benar pada tes tetap tampil sebagai 0, sedangkan jawaban belum dikirim tampil —.
4. Buka rincian log untuk memeriksa hitungan sampel, tawaran, penerimaan/penolakan, manual override, dan durasi mode. Bandingkan REAL dengan SIMULATION.
5. Selesaikan satu sesi baru, lalu tekan Perbarui hasil atau tunggu pembaruan berkala. Pastikan jumlah pasangan bertambah hanya setelah kedua blok lengkap dan sesuai filter.
6. Ganti tab pengaturan, ubah draf alokasi tanpa menyimpan, lalu kembali melalui tab untuk memeriksa draf tetap ada. Jangan memakai data MAIN untuk pemeriksaan teknis.
7. Kunci ruang peneliti; akses langsung API hasil tanpa cookie/password peneliti harus ditolak. Kembali ke LMS untuk memastikan alur peserta tetap berjalan.

## File implementasi

- `src/features/research/results-model.ts`: proyeksi hasil, pasangan lengkap, mean, dan ringkasan event.
- `src/features/research/results-dashboard.tsx`: filter, kartu ringkasan, tabel/grafik ECL, dan pembaruan berkala.
- `src/features/research/results-detail.tsx`: rincian skor, jawaban, dan log per blok.
- `src/features/research/workspace.tsx`: layout peneliti tanpa sidebar.
- `src/app/api/research/results/route.ts`: API hasil khusus peneliti.
- `src/features/research/store.ts`: pembacaan record/log dan identitas kelompok versi.
- `src/features/research/operator.tsx`, `settings-gate.tsx`: tab hasil/pengaturan dan akses password.
- `src/features/lms/student-shell.tsx`, `student-sidebar.tsx`: pemilihan layout peneliti dan label menu.
- `src/app/(student)/profile/settings/page.tsx`: judul halaman peneliti.

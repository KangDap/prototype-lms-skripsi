# Alur prototipe penelitian

Profil FER pilot terbaru: PILOT_A/B/C memakai parameter temporal yang sama (5 detik, sampling 1 detik, minimum 4 valid, rasio 0,60, persistence 2/2); hanya confidence berbeda **0,60 / 0,50 / 0,40**. PILOT_C tetap aktif sementara. Lihat [panduan konfigurasi confidence](fer-confidence-pilot.md) untuk cara mengganti profil, snapshot lama, dan penguncian interval dari environment.

Materi aktif **statistics-id-draft-4**: dua modul ditulis ulang secara formal, masing-masing empat subbab, memakai delapan SVG yang disediakan serta tabel di dalam alur paragraf. Lihat [laporan revisi materi](material-revision-draft-4.md) dan [teks lengkap](learning-modules-draft-4.md). ID bagian tetap; sesi lama mempertahankan materi sebelumnya. FER, AUI, soal, CLT, dan alur eksperimen tidak diubah pada revisi konten ini. Aplikasi dan pengujian belum dijalankan.

**Rancangan aktif 14 November 2026:** baca [laporan revisi dan panduan verifikasi](revision-2026-11-14.md). Sesi baru memakai tawaran FER dengan pilihan pengguna langsung FOCUS/ASSISTED/TIDAK, PILOT_C minimum **4** valid per 5 detik, tes 8 butir A–E, CLT tiga langkah, dan panduan awal peserta. Uraian 12–13 November berikut adalah riwayat, terutama trigger otomatis, 4 soal, dan minimum 3 valid yang sudah diganti. Revisi 14 November belum dijalankan atau diuji.

Pembaruan 13 November 2026: profil pengujian awal sekarang **PILOT_C**, window 5 detik, sampling 1 detik, minimum 3 valid, confidence/rasio negatif/stable 0,60, persistence negatif/stable 2/2, cooldown 30 detik dan recovery 1 detik. Buat sesi TEST baru untuk memakainya; sesi lama tetap memakai snapshot lamanya. Lihat [rincian PILOT_C](pilot-c.md). Uraian PILOT_A/B di bawah tetap berlaku jika profil tersebut dipilih.

Implementasi revisi 12 November 2026. Perubahan ini belum dijalankan melalui aplikasi, build, lint, typecheck, atau tes otomatis sesuai permintaan pengguna. Hasil pemeriksaan versi AUI sebelumnya tidak menjadi bukti validasi perubahan ini.

Pembaruan 12 November 2026: peserta masuk melalui form kode peserta/PC di `/`, dengan alokasi otomatis dari berkas konfigurasi privat. Siapkan alokasi sekali melalui pengaturan sebelum membagikan paket ke lab; lihat [lab-setup.md](lab-setup.md). Form pembuatan sesi manual di bawah tetap tersedia sebagai alat peneliti opsional. Revisi terbaru juga belum dijalankan atau dites.

## Menjalankan untuk pemeriksaan sendiri

Pembaruan `research-2026-11-12-v6`: setiap butir CLT menampilkan angka 1–9 dalam satu baris dengan pilihan lingkaran, label ujung kiri/kanan, dan petunjuk arah skala. Pada layar sempit skala dapat digeser horizontal. Panel **Pengujian trigger AUI · TEST** berada di atas isi materi pada fase belajar blok ADAPTIVE. Panel membutuhkan development (`pnpm.cmd lab:dev`, atau `pnpm.cmd dev` jika FER dijalankan terpisah) dan `AUI_RESEARCH_MODE=false`. TEST pada production tidak menampilkan simulasi; NON_ADAPTIVE selalu mempertahankan mode normal. Jangan mengganti urutan alokasi hanya untuk menguji: pilih sesi TEST baru urutan 1/3 jika ingin blok pertama ADAPTIVE.

Pembaruan antarmuka (`research-2026-11-12-v5`): navbar atas tetap terlihat saat scroll. Pengiriman pretest/posttest/CLT dan penyelesaian belajar meminta konfirmasi terlebih dahulu. **Periksa kembali** menutup dialog tanpa mengirim atau mengubah fase; konfirmasi meneruskan penyimpanan. Toast menampilkan proses, sukses setelah konfirmasi server, atau kegagalan. Autosave dan pengiriman FER berkala tidak memunculkan toast setiap sampel/jawaban. Toast tersedia pada kedua kondisi UI tanpa menampilkan skor penelitian.

Untuk pemeriksaan manual, coba batalkan dialog lalu kirim kembali, termasuk dengan keyboard. Putuskan koneksi LMS ketika submit untuk memeriksa toast gagal dan antrean yang tetap tersimpan; gunakan **Coba simpan kembali** setelah koneksi pulih. Scroll materi lalu buka dialog/notifikasi: navbar harus tetap terlihat dan dialog harus tampil di atasnya. Pemeriksaan ini belum dijalankan oleh asisten.

1. Jalankan layanan FER seperti panduan [FER](fer-integration.md), lalu jalankan LMS dengan `pnpm.cmd dev`. Tidak ada dependensi baru untuk subsistem penelitian.
2. Isi `RESEARCHER_KEY` pada `.env.local` dengan password pilihan Anda, lalu restart LMS. Password wajib juga saat development/TEST; tidak ada akses pengaturan tanpa password.
3. Buka dropdown profil di bagian bawah sidebar → **Pengaturan penelitian** (`/profile/settings`). Masukkan password. Formulir sesi/ekspor baru dimuat setelah akses diverifikasi server. Jika port LMS berbeda, sesuaikan alamat dan CORS layanan FER.
4. Buat sesi **TEST baru**, misalnya peserta `TEST001`, PC `LAB01`, urutan 1, profil `PILOT_A`. Pengaturan dikunci saat meninggalkan halaman atau selesai menyiapkan sesi. Membuka pengaturan lagi memerlukan password.
5. Anda diarahkan ke dashboard. Buka course **Literasi dan Interpretasi Data**, kemudian materi yang tersedia. Tidak ada guidance bawah atau layar persetujuan/persiapan kamera di aplikasi. Pretest tampil terlebih dahulu; kamera belum aktif.
6. Isi empat soal draf pretest. Tombol kirim aktif setelah seluruh soal dijawab.
7. Setelah pretest dikirim, pembelajaran meminta FER aktif otomatis. Izin kamera bawaan browser tetap diperlukan saat belum diberikan; aplikasi tidak dapat melewatinya. Tidak ada tombol aktivasi tambahan. Jika gagal, periksa layanan/izin lalu gunakan **Coba kamera lagi**. Baca empat subbab, lihat diagram, gunakan tooltip/glosarium, dan coba outline. Isi pembelajaran identik pada setiap kondisi UI.
8. Tekan **Selesai belajar**. Kamera berhenti dan log menunggu konfirmasi penyimpanan sebelum membuka posttest pada halaman materi yang sama.
9. Isi empat soal draf posttest. Setelah dikirim, CLT terbuka otomatis. Instruksi CLT mengacu pada pengalaman mempelajari materi, bukan pengerjaan tes.
10. Isi 15 pernyataan CLT berskala 1–9, lalu **Kirim kuesioner**. Setelah blok selesai, peserta otomatis kembali ke course. Buka materi berikutnya untuk memulai blok kedua. Setelah blok kedua selesai, peserta kembali ke course dengan kedua materi berstatus selesai. Urutan modul mengikuti sesi; tampilan/window/cooldown FER dimulai ulang.
11. Setelah kedua materi selesai, peneliti membuka pengaturan melalui dropdown profil, memasukkan password, dan mengunduh JSON/CSV. Skor dimensi tidak ditampilkan kepada peserta atau dikirim melalui respons API peserta.

Alur baru berlaku pada sesi yang dibuat setelah revisi ini (`flowVersion=POSTTEST_THEN_CLT`). Sesi lama tanpa field tersebut mempertahankan urutan CLT → posttest dan ditandai sebagai alur lama di pengaturan. Untuk mencoba urutan baru, buat sesi TEST baru. Ekspor mencantumkan `flow_version`; utilitas penggabungan menolak campuran alur berbeda.

Tidak ada kewajiban menunggu 15 menit untuk pemeriksaan teknis. Estimasi materi 15–20 menit merupakan target awal pilot, bukan bukti durasi atau kesetaraan. Pada 60 menit aplikasi memberi informasi untuk menghubungi peneliti; tidak ada penghentian atau pengisian jawaban otomatis karena aturan finalnya belum disepakati.

## Empat urutan

| Urutan | Blok 1 | Blok 2 |
|---|---|---|
| 1 | Sampling Bias, ADAPTIVE | Correlation vs Causation, NON_ADAPTIVE |
| 2 | Sampling Bias, NON_ADAPTIVE | Correlation vs Causation, ADAPTIVE |
| 3 | Correlation vs Causation, ADAPTIVE | Sampling Bias, NON_ADAPTIVE |
| 4 | Correlation vs Causation, NON_ADAPTIVE | Sampling Bias, ADAPTIVE |

Operator menetapkan urutan sebelum mulai. Peserta tidak memiliki pemilih kondisi. Variabel legacy `AUI_EXPERIMENT_CONDITION` tidak mengatur sesi aktif; kondisi berasal dari snapshot sesi. Materi tanpa sesi dapat dibaca tanpa menjalankan FER/AUI atau merekam hasil penelitian.

## Memeriksa AUI

Perombakan UI tiga mode tersedia pada `research-2026-11-12-v7`: lihat [rancangan pembaca adaptif](aui-reading-redesign.md). Gunakan sesi TEST baru untuk snapshot materi `statistics-id-draft-2` yang mencakup istilah, contoh, dan ringkasan kontekstual. Aturan trigger tetap sama.

- `BASELINE`: window 10 detik, minimum 8 sampel valid, rasio negatif 0,6, persistence negatif/stabil 2/2.
- `PILOT_A`: window 20 detik, minimum 12 sampel valid, rasio negatif 0,6, persistence negatif/stabil 1/2.
- `PILOT_B`: seperti PILOT_A, tetapi rasio negatif 0,5.
- Confidence minimum 0,6, rasio stabil 0,6, cooldown 30 detik, recovery 1 detik. Semua angka merupakan kandidat desain yang perlu pilot.
- Pada TEST development, blok ADAPTIVE menampilkan panel **Debug AUI** jika `AUI_RESEARCH_MODE` bukan `true`. Pilih SIMULATION, Anger, confidence 0,82, lalu mulai. Dengan profil PILOT_A, window negatif valid pertama dapat memicu Focus setelah sekitar 20 detik. Tawaran bantuan memerlukan evaluasi window baru setelah cooldown; tidak langsung muncul pada detik ke-30.
- Terima atau tolak bantuan; coba kembali normal dan nonaktifkan adaptasi. Glosarium serta outline tetap tersedia pada kedua kondisi; Assisted menonjolkannya. Tawaran ditampilkan tanpa menambah tinggi artikel.
- Neutral/Happiness tetap STABLE. Tidak ada trigger berbasis durasi atau perubahan Neutral menjadi negatif. Tidak muncul adaptasi merupakan hasil yang dapat dicatat.
- SIMULATION hanya untuk TEST; log mempunyai sumber terpisah. NON_ADAPTIVE tetap DEFAULT. Debug tidak muncul pada PILOT/MAIN atau production.
- Pada tahap belajar tidak ada preview webcam. Indikator membedakan kamera belum aktif, menunggu hasil baru, wajah terlihat/tidak terlihat, beberapa wajah, dan error. Hasil lama lebih dari lima detik tidak mempertahankan status wajah terlihat.
- Indikator berada di header semua halaman. Kamera/inferensi berhenti ketika meninggalkan materi, mengisi pretest/posttest/CLT, atau membuka pengaturan. Status kembali nonaktif; tidak ada inferensi latar belakang hanya untuk membuat indikator terlihat aktif.
- Guidance telah dihapus. Formulir berganti otomatis pada halaman materi; setelah seluruh evaluasi blok selesai, peserta kembali ke course. Materi berikutnya terkunci sampai blok sebelumnya selesai; progres dashboard/course mengikuti blok yang telah selesai. Pesan simpan/error tetap tersedia.
- FER otomatis mulai saat fase belajar, termasuk setelah refresh/kembali ke materi/tab terlihat. Tidak aktif di pretest, posttest, CLT, dashboard, course, atau pengaturan. Aktivasi otomatis tidak menjalankan proses Python: layanan FER harus sudah berjalan melalui launcher atau terminal.

## CLT dan keputusan yang masih perlu finalisasi

Konfigurasi: `src/features/research/clt.ts`.

- `CLT_INDONESIAN_TEXT` sudah memuat tepat 15 redaksi Bahasa Indonesia dari peneliti. Versi `id-source-draft-2`, skema ID `SOURCE`, status **DRAFT**, untuk ditinjau dan diuji sebelum eksperimen utama. Tidak ada klaim terjemahan sudah divalidasi.
- Instrumen: Krieglstein et al. (2023), final Table 11, DOI https://doi.org/10.1007/s10648-023-09738-0.
- ICL1–5 menggunakan Item 1–5; ECL1–5 menggunakan Item 6–10.
- Sesi baru mempertahankan ID GCL1, GCL3, GCL5, GCL6, GCL7, yaitu Item 11, 13, 15, 16, 17. GCL2/GCL4 hanya didukung untuk snapshot sesi lama yang memakai ID internal berurutan. Jawaban sesi lama tidak dikonversi atau ditimpa.
- Skala integer 1–9, tanpa pilihan awal. Seluruh 15 butir harus valid sebelum pengiriman. Server menghitung rata-rata lima butir tiap dimensi secara terpisah; tidak ada skor gabungan, imputasi, pembalikan skor, atau input dari FER. ECL adalah hasil utama.
- Jawaban dan skor disimpan di server; respons peserta tidak membawa skor dimensi atau kunci tes. Draf disimpan, tetapi tidak dianggap pengiriman final. Pengiriman final berlaku sekali per blok (dua blok/sesi peserta); retry dengan jawaban sama tidak membuat pengiriman baru, jawaban berbeda ditolak.
- Data CLT mencakup `startedAt`, `submittedAt`, `durationMs`, dan `responseSource`. Durasi dihitung dari masuk fase CLT sampai pengiriman final menggunakan waktu server, termasuk jeda/refresh; bukan waktu aktif menjawab saja. Identitas peserta/sesi/blok, kondisi, materi, dan urutan berasal dari sesi server.
- Setelah redaksi disetujui, naikkan versi instrumen dan ubah status menjadi APPROVED. Buat sesi baru untuk memakai redaksi baru: sesi lama sengaja menyimpan snapshot instrumen sebelumnya.

Konfigurasi metodologi: `src/features/research/protocol.ts`. Sesi baru menggunakan pretest → belajar → posttest → CLT. Empat soal pilihan ganda berbobot sama dengan contoh paralel tetap draf. Periksa penempatan pretest, jumlah/bobot/bentuk soal, kesetaraan tes, durasi/aturan penghentian, kesetaraan materi, dan metode analisis bersama pembimbing. Jangan hanya mengubah nama pengaturan jika keputusan final membutuhkan perubahan alur.

TEST/PILOT dapat memakai draf CLT yang teksnya sudah lengkap. MAIN memerlukan instrumen APPROVED, status metodologi APPROVED, profil hasil pilot yang disetujui pada alokasi (atau `RESEARCH_MAIN_PROFILE`), dan `RESEARCHER_KEY`. Tetapkan persetujuan setelah peninjauan/pilot; jangan menandai APPROVED sekadar untuk melewati blokir. Materi dan soal saat ini adalah draf untuk ditinjau, bukan instrumen pemahaman yang telah divalidasi.

## Simulasi CLT tanpa data responden

Buat sesi TEST baru menggunakan kode peserta yang belum dipakai. Sesi lama membekukan snapshot; memulihkannya tidak memperbarui teks instrumen. Jika kode contoh sudah terpakai, tambahkan kode TEST baru melalui konfigurasi alokasi atau pembuatan sesi manual peneliti.

Pada fase CLT sesi TEST, buka **Simulasi jawaban · TEST**. Pilihan **Isi semua 1**, **Isi semua 9**, atau **Isi contoh campuran** mengisi angka, tanpa mengirim otomatis. Jawaban simulasi ditandai `responseSource=SIMULATION`, termasuk setelah diedit/refresh. Pengisian biasa ditandai `PARTICIPANT`; nilai lama tanpa penanda diekspor sebagai `UNSPECIFIED_LEGACY`. Kontrol simulasi tidak tersedia pada PILOT/MAIN dan server menolak penanda simulasi untuk kedua jenis itu.

Untuk memeriksa sendiri: campuran menghasilkan ICL=3, ECL=5, GCL=7 pada ekspor peneliti; semua 1/9 menghasilkan masing-masing mean 1/9. Coba kosongkan satu butir: tombol kirim harus nonaktif. Refresh harus mempertahankan draf. Setelah kirim, buka course dan lanjutkan blok kedua; jawaban final pertama tetap terkunci. Gunakan ekspor TEST secara terpisah dari data eksperimen.

Skrip regresi murni `pnpm.cmd test:clt` disiapkan untuk pemetaan ID, validasi, mean, dan kompatibilitas snapshot lama. Skrip belum dijalankan pada revisi ini.

## Autosave, refresh, dan pemulihan

- Server menggunakan Node Route Handlers dan folder `.research-data` di root proyek, di luar `public` dan diabaikan Git. `RESEARCH_DATA_DIR` dapat menunjuk folder lain di luar `public`.
- `<uuid>.json` berisi identitas berkode, fase, jawaban, skor, snapshot materi/soal/instrumen/config, versi, dan ID operasi yang sudah diproses. File ditulis melalui file sementara, disinkronkan, lalu diganti secara atomik.
- `<uuid>.events.jsonl` berisi batch event dengan konteks peserta/blok yang ditentukan server. Retry memakai ID operasi/event untuk menghindari duplikasi. Potongan tulisan terakhir yang gagal dan belum diakui dibuang sebelum append berikutnya.
- Jawaban masuk antrean IndexedDB setiap perubahan. Event dipindahkan dari runtime ke antrean sekitar setiap dua detik, kemudian dikirim ke server. Pesan membedakan antrean lokal dan konfirmasi disk server.
- Jangan menutup browser ketika ada error simpan. **Coba simpan kembali** mengirim ulang antrean. Transisi fase menunggu semua operasi sebelumnya dan penulisan final diakui.
- Refresh menggunakan kredensial tab di sessionStorage, mengirim ulang antrean, lalu memulihkan fase/draf. Window FER parsial tidak dipulihkan; kamera diminta aktif otomatis ketika kembali pada fase belajar. Rentang `performance.now()` berbeda antar-episode dan tidak boleh digabung langsung.
- Provider sesi tetap terpasang saat navigasi dashboard/course/materi. Draf yang belum mendapat respons terakhir tetap dipertahankan pada tampilan; meninggalkan materi menghentikan FER dan menutup episode log, kemudian kembali ke materi membuka episode baru dengan window baru.
- Jika tab ditutup, buka pengaturan melalui dropdown profil pada browser/profil yang sama, masukkan password, lalu pilih **Pulihkan / buka sesi**. Token akses dirotasi; antrean browser memakai token baru. Peserta melanjutkan melalui dashboard/course. Jika berpindah profil/browser, data yang sudah diakui server dapat dipulihkan, tetapi antrean di browser lama tidak ikut pindah.
- Gunakan satu tab sesi aktif per PC. Tutup tab sesi lama sebelum pemulihan pada tab baru agar tidak ada dua tab yang terus mengirim data untuk peserta yang sama.
- Event yang belum sempat dipindahkan dari RAM atau belum memperoleh konfirmasi tidak dijamin selamat dari penutupan paksa. Ringkasan terakhir dapat tidak lengkap pada crash; ketidaklengkapan perlu diperiksa pada JSON. Tidak ada gambar/video yang disimpan.
- Untuk penghentian manual, selesaikan antrean pada browser peserta dahulu, lalu gunakan **Akhiri sebagai belum lengkap** di halaman peneliti. Fase tidak dikirim otomatis, jawaban kosong tidak diubah nol.
- Simpan salinan folder/ekspor setiap PC sebelum menghapus profil browser atau mengganti instalasi. Satu instance Node LMS per PC; penyimpanan file ini tidak dirancang untuk beberapa proses server yang menulis folder sama secara bersamaan.

## Ekspor dan penggabungan PC

Hasil lokal juga dapat dilihat lewat **Profil → Ruang peneliti → Dashboard hasil**. Halaman peneliti tidak memakai sidebar mahasiswa. Lihat [panduan dashboard peneliti](researcher-dashboard.md) untuk filter, aturan rata-rata berpasangan, rincian jawaban, dan log AUI.

- **JSON:** record lengkap dan batch event; tidak menyertakan token akses atau hash token.
- **ITEMS:** jawaban CLT per butir beserta dimensi, identitas sumber Table 11, waktu mulai/kirim, durasi, dan sumber jawaban.
- **BLOCKS:** skor ICL/ECL/GCL, tes, durasi, kelengkapan, dan ringkasan kualitas FER nyata serta paparan mode.
- `learning_ms` adalah durasi fase belajar sampai pembukaan posttest pada alur baru (sampai CLT pada alur lama), termasuk jeda navigasi. Waktu mode yang terlihat dihitung terpisah dari episode di halaman materi; jangan menyamakan durasi fase dengan durasi membaca aktif.
- **PAIRED:** satu baris per peserta/sesi, kolom ADAPTIVE dan NON_ADAPTIVE berdampingan, beserta materi, urutan, durasi CLT, dan sumber jawaban. `paired_complete` menunjukkan kelengkapan; tidak menyatakan kelayakan data simulasi untuk analisis utama. Status instrumen dan skema ID turut diekspor.
- Ekspor sesi yang masuk melalui form memuat `allocation_version` dan `allocation_digest`, untuk menelusuri konfigurasi saat sesi dibuat. Sesi manual/versi lama membiarkan kolom ini kosong.
- **TESTS:** jawaban tes per soal. Indeks pilihan/kunci dimulai dari 0. Tidak ada feedback selama eksperimen.
- **MINUTES:** ringkasan interval sekitar 60 detik, termasuk interval parsial, sumber, distribusi label, frekuensi sampel, error, dan waktu tiap mode. Waktu mode hanya menghitung bagian tab terlihat; waktu tersembunyi terpisah. Ringkasan bukan input rule engine.

Gunakan satu ekspor JSON terbaru untuk tiap sesi dari semua PC, kumpulkan dalam satu folder, lalu jalankan sendiri bila diperlukan:

```powershell
node scripts/merge-research.cjs C:\data-ekspor C:\hasil-gabungan-baru MAIN
```

Untuk dataset teknis, ganti MAIN dengan TEST. Script membuat `items.csv`, `blocks.csv`, `paired.csv`, dan `sessions.json`. Script menolak folder output yang sudah ada, duplikasi ID sesi/kode peserta, serta campuran snapshot/versi/config berbeda. TEST/PILOT/MAIN tidak digabung menjadi satu dataset. Kelengkapan pasangan tetap ditandai; tidak ada pengujian hipotesis otomatis.

## Lokasi pengeditan

| Kebutuhan | File |
|---|---|
| Materi, refleksi, glosarium, rujukan | `src/features/research/content.ts` |
| Diagram dan penyajian materi | `src/features/research/material-view.tsx` |
| Soal/kunci pretest dan posttest | `src/features/research/assessments.ts` — server saja |
| Redaksi/identitas/penskoran CLT | `src/features/research/clt.ts` |
| Versi dan keputusan metodologi draf | `src/features/research/protocol.ts` |
| Profil agregasi AUI | `src/features/aui/config.ts` |
| Sesi global dan indikator kamera | `src/features/research/session-provider.tsx`, `src/features/fer/face-indicator.tsx` |
| Alur pada halaman materi | `src/features/research/material-page.tsx` |
| Pesan simpan/error tanpa guidance | `src/features/research/save-status.tsx` |
| Password pengaturan | `src/features/research/settings-gate.tsx`, `src/features/research/access.ts` |
| Penyimpanan dan validasi server | `src/features/research/store.ts` |

Referensi materi utama: OpenStax *Introductory Statistics 2e*, bagian 1.1, 1.2, 1.4, dan 12.2. Tautan sumber ditampilkan dalam setiap modul; narasi dan ilustrasi kampus disusun khusus untuk prototipe.

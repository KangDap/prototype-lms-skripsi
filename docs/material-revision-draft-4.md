# Revisi materi — statistics-id-draft-4

## Status pengerjaan

Audit dan implementasi dilakukan melalui pembacaan serta pengeditan source. Aplikasi, server, build, lint, typecheck, pengujian otomatis, webcam, dan simulasi tidak dijalankan. Tidak membuat data sesi baru, menghapus data, atau melakukan commit/push. Model FER, windowing, state machine AUI, CLT, alur eksperimen, jumlah soal dan penskoran tidak diubah.

## Materi yang ditulis ulang

Judul tetap **Sampling Bias** dan **Correlation vs Causation**. Teks disusun sebagai uraian formal Bahasa Indonesia: konsep, hubungan antarkonsep, contoh, tabel/visual, lalu refleksi. Referensi utama telah dibaca pada halaman OpenStax 1.1, 1.2, 12.2, 12.3, dan 1.4 yang tercantum di setiap modul. Paragraf ditulis orisinal, tidak disalin atau diterjemahkan langsung dari buku.

Salinan teks lengkap untuk peninjauan tanpa menjalankan LMS: [learning-modules-draft-4.md](learning-modules-draft-4.md). Source aplikasi tetap `src/features/research/content.ts`.

| Materi | Subbab baru | Substansi utama |
|---|---|---|
| Sampling Bias | Populasi dan Sampel | Alasan sampling; populasi sasaran, kerangka, sampel terpilih, responden akhir; representativitas dan generalisasi |
| Sampling Bias | Teknik Sampling dan Sumber Bias | Probabilitas/nonprobabilitas; simple random dan stratified sampling; komposisi; convenience, undercoverage, voluntary response, nonresponse, serta bias pertanyaan |
| Sampling Bias | Dampak Sampling Bias terhadap Hasil Penelitian | Tabel populasi/responden/keluhan; 35% dan 55% bersyarat; variasi acak, bias sistematis, dan keterbatasan sampel besar |
| Sampling Bias | Evaluasi Hasil Survei | Audit populasi, kerangka, pemilihan, respons, dan batas kesimpulan; kasus 82% responden asisten laboratorium |
| Correlation vs Causation | Variabel dan Scatter Plot | Pasangan X/Y, contoh titik (4, 65), arah, kekuatan versus kemiringan, outlier, dan pola nonlinear |
| Correlation vs Causation | Korelasi dan Kausalitas | Hubungan statistik versus sebab-akibat, arah terbalik, faktor ketiga, kegunaan hubungan/prediksi tanpa bukti kausal |
| Correlation vs Causation | Confounding dan Desain Studi | Motivasi awal, penggunaan aplikasi dan aktivitas; observasional/eksperimen; random sampling versus assignment; keterbatasan pengacakan |
| Correlation vs Causation | Interpretasi Hasil Studi | Studi 120 mahasiswa; 8.000 versus 6.000 langkah; selisih 2.000, self-selection, kondisi awal, serta perbaikan desain |

Kasus numerik Sampling Bias tetap menggunakan populasi 1.000 (600 jauh, 400 dekat), responden 200 (40 jauh, 160 dekat), dan keluhan 30/40 serta 40/160. Tingkat keluhan kelompok 75% dan 25%; gabungan responden 35%. Angka 55% hanya hasil pembobotan dengan asumsi tingkat kelompok berlaku di populasinya. Tidak ada klaim bahwa 55% adalah nilai populasi sebenarnya.

## Integrasi delapan SVG

Seluruh SVG dan PNG yang diminta sudah terdapat pada `public/images/lessons` saat audit. Tidak diperlukan ekstraksi ZIP tambahan. Pasangan PNG diperiksa secara visual dan dimensi/label SVG dibaca. Semua SVG berukuran/viewBox 1400 × 788; angka 60/40 versus 20/80 dan 8.000/6.000 konsisten dengan uraian. Tidak mengubah, menggambar ulang, atau menambahkan tulisan ke aset gambar. PNG tetap tersedia; renderer memakai SVG utama.

| Subbab | Berkas relatif terhadap public/images/lessons | Posisi dalam modul |
|---|---|---|
| Sampling 1 | sampling-bias/01_populasi_dan_sampel.svg | Setelah paragraf ketiga yang membedakan empat tahap populasi hingga responden |
| Sampling 2 | sampling-bias/02_komposisi_sampel.svg | Setelah penjelasan komposisi/keterwakilan, sebelum uraian convenience dan sumber bias lainnya |
| Sampling 3 | sampling-bias/03_populasi_vs_responden.svg | Tepat setelah tabel komposisi, sebelum perhitungan 35% dan 55% |
| Sampling 4 | sampling-bias/04_evaluasi_survei.svg | Setelah urutan evaluasi kualitas survei, sebelum pertanyaan refleksi |
| Correlation 1 | correlation-vs-causation/01_pola_scatter_plot.svg | Setelah penjelasan arah scatter plot, sebelum kekuatan hubungan |
| Correlation 2 | correlation-vs-causation/02_korelasi_dan_kausalitas.svg | Setelah definisi/perbedaan korelasi dan kausalitas, sebelum contoh aplikasi |
| Correlation 3 | correlation-vs-causation/03_faktor_perancu.svg | Segera setelah contoh motivasi awal, sebelum pembahasan desain studi |
| Correlation 4 | correlation-vs-causation/04_perbandingan_aktivitas.svg | Tepat setelah tabel perbandingan kelompok, sebelum penjelasan selisih, self-selection dan kausalitas |

`LessonSectionBody` menyisipkan tabel dan gambar menurut `afterParagraph` (indeks mulai nol). Jika posisinya sama, tabel muncul sebelum gambar. Gambar menggunakan Next Image dengan SVG unoptimized, dimensi intrinsik, `w-full h-auto`, alt informatif dan caption. Dimensi membantu menyediakan ruang sebelum gambar dimuat, tanpa mengubah mekanisme pemeliharaan posisi baca. Tabel mempunyai caption, header baris/kolom, dan pembungkus scroll horizontal pada ruang sempit.

## Glossary dan contextual assistance

Glosarium diperluas menjadi 20 istilah per modul. Tambahan Sampling Bias mencakup tahapan sampel, generalisasi, sampling probabilitas/nonprobabilitas, simple random/stratified/convenience sampling, variasi dan estimasi. Tambahan Correlation mencakup pengamatan berpasangan, arah/kekuatan, outlier/nonlinear, random sampling/assignment, self-selection serta efek kausal.

Pemetaan tetap menggunakan materialId dan sectionId yang sama. Contoh bantuan merujuk langsung pada paragraf materi utama; ringkasan menyatakan kembali substansi yang sudah dijelaskan. Bantuan tidak menambahkan kasus atau konsep eksklusif Assisted. Glosarium dan panel manual tetap tersedia di DEFAULT/NON_ADAPTIVE; semua mode memakai komponen isi, tabel dan SVG yang sama. Outline, progress dan ID anchor paragraf tetap menggunakan pola sebelumnya.

## Audit kesesuaian pretest/posttest

Soal tidak diubah. Empat paket tetap berisi 8 butir dengan opsi A–E dan bobot yang sama; versi tes tidak dinaikkan karena butir/kunci tidak berubah. Cakupan konseptual masih sesuai:

| Konsep | Butir pretest | Butir posttest | Letak dalam materi baru |
|---|---|---|---|
| Populasi/sampel | SB-PRE-1 | SB-POST-1 | Sampling 1 |
| Undercoverage | SB-PRE-2 | SB-POST-2 | Sampling 2 dan 4 |
| Voluntary response | SB-PRE-3 | SB-POST-3 | Sampling 2 dan 4 |
| Inferensi/perbaikan | SB-PRE-4 | SB-POST-4 | Sampling 3 dan 4 |
| Kerangka sampel | SB-PRE-5 | SB-POST-5 | Sampling 1 dan 4 |
| Representativitas | SB-PRE-6 | SB-POST-6 | Sampling 1–3 |
| Convenience | SB-PRE-7 | SB-POST-7 | Sampling 2 |
| Nonresponse | SB-PRE-8 | SB-POST-8 | Sampling 2 dan 4 |
| Arah hubungan | CC-PRE-1 | CC-POST-1 | Correlation 1 |
| Klaim kausal | CC-PRE-2 | CC-POST-2 | Correlation 2 dan 4 |
| Confounding | CC-PRE-3 | CC-POST-3 | Correlation 3 |
| Penugasan acak | CC-PRE-4 | CC-POST-4 | Correlation 3 dan 4 |
| Pasangan data | CC-PRE-5 | CC-POST-5 | Correlation 1 |
| Kekuatan hubungan | CC-PRE-6 | CC-POST-6 | Correlation 1 |
| Hubungan nonlinear | CC-PRE-7 | CC-POST-7 | Correlation 1 |
| Arah terbalik | CC-PRE-8 | CC-POST-8 | Correlation 2 |

**Redaksi yang perlu ditinjau:** SB-POST-1 menanyakan mana 'sampelnya' dan kuncinya 90 mahasiswa yang memberikan jawaban. Modul baru membedakan sampel terpilih dari responden akhir. Jawaban itu masih tepat untuk sampel yang memberikan data, tetapi frasa pertanyaan lebih jelas jika menyebut 'sampel yang diamati/responden akhir'. Butir dan kunci belum diubah sesuai batasan peneliti.

Konteks beberapa soal Correlation masih nilai ujian/catatan digital, sedangkan contoh utama modul menggunakan kebugaran. Konsep hubungan, confounding dan desain tetap sama; soal tersebut menguji penerapan lintas konteks. Tidak ada soal yang bergantung pada angka kasus lama 78/68 atau 10 poin. Tinjau melalui pilot apakah tingkat transfer dan kesulitan kedua bentuk sebanding.

Simple random/stratified sampling dan outlier kini dijelaskan lebih lengkap, tetapi tidak masing-masing mempunyai butir tes khusus. Jangan menafsirkan skor sebagai pengukuran terpisah untuk seluruh tambahan konsep tersebut. Keputusan mengubah distribusi butir, jika diperlukan, tetap memerlukan peninjauan instrumen; tidak dilakukan pada revisi ini.

## Versi dan kompatibilitas

MATERIAL_VERSION naik dari statistics-id-draft-3 menjadi **statistics-id-draft-4**. Penambahan opsional `figure` dan `tables` berada pada snapshot bagian materi; mekanisme penyimpanan tidak berubah. Sesi baru membekukan teks, glossary, bantuan, posisi gambar dan tabel baru. Record/snapshot sesi sebelumnya tidak dimigrasikan. Renderer masih mendukung `diagram` pada sesi lama. Dashboard dan penggabungan sudah membedakan materialVersion serta snapshot materi; jangan mencampur kedua versi untuk satu analisis perlakuan.

Gunakan sesi baru untuk membaca revisi dari alur penelitian. Memulihkan sesi lama tetap membuka materi yang disimpan saat sesi tersebut dibuat. Estimasi durasi lama tetap dipertahankan; ketercapaian durasi dan kesetaraan beban materi perlu diperiksa kembali pada pilot.

## Berkas yang diubah

- `src/features/research/content.ts`: teks, tujuan, judul subbab, glosarium, metadata tabel/SVG dan referensi termasuk 12.3.
- `src/features/research/contextual-content.ts`: contoh, istilah dan ringkasan kedelapan subbab.
- `src/features/research/lesson-section-body.tsx`: komponen baru untuk isi paragraf, tabel dan visual berurutan dengan fallback snapshot lama.
- `src/features/research/material-reader.tsx`: menggunakan komponen isi bersama, mempertahankan navigasi dan anchor.
- `src/features/research/protocol.ts`: hanya nilai MATERIAL_VERSION.
- Dokumentasi ini, salinan modul, serta tautan dari panduan alur/README.

## Pemeriksaan manual berikutnya

Periksa pada sesi baru: seluruh delapan SVG dimuat; tabel mendahului gambar pada contoh numerik; caption/angka sesuai; tampilan nyaman di desktop dan layar kecil; perpindahan DEFAULT/FOCUS/ASSISTED mempertahankan bagian aktif; bantuan yang sama tersedia di NON_ADAPTIVE; tooltip istilah baru dapat dibuka dengan keyboard/tap. Periksa bahwa hasil ekspor sesi baru memuat materialVersion draft-4 dan snapshot tabel/figure, sedangkan sesi lama tetap menggunakan konten lama. Pemeriksaan aplikasi ini belum dilakukan oleh asisten.

# Rancangan pembaca adaptif

Implementasi `research-2026-11-12-v7`, materi `statistics-id-draft-2`. Kode belum dijalankan, dibangun, atau dites oleh asisten sesuai permintaan peneliti. Wireframe digunakan untuk konsep tata letak; warna, tombol, kartu, dan navigasi mengikuti LMS yang ada.

## Audit dan tujuan penyajian

Implementasi sebelumnya memakai artikel panjang yang sama pada semua mode. Focus hanya menutup sidebar menjadi ikon dan Assisted memberi aksen pada outline/glosarium. Perombakan memisahkan pembaca, posisi baca, dan panel bantuan agar perubahan bersifat fungsional.

| Mode | Penyajian | Akses bantuan |
|---|---|---|
| DEFAULT | Artikel lengkap, sidebar LMS, outline/glosarium di sisi materi, indikator bagian aktif | Tombol Bantuan bagian ini membuka konten terstruktur secara manual |
| FOCUS | Sidebar utama disembunyikan sepenuhnya, satu bagian aktif, kolom baca terpusat dengan maksimum 76ch, Previous/Next | Daftar bagian dan bantuan tetap dapat dibuka manual |
| ASSISTED | Pembaca per bagian dengan panel kontekstual di sisi kanan pada layar lebar | Istilah terkait, contoh relevan, dan ringkasan dapat dibuka/tutup secara terpisah |

Default tetap merupakan LMS yang layak digunakan. Mode Focus bertujuan membatasi pencarian navigasi dan memusatkan penyajian satu bagian; Assisted bertujuan mendekatkan dukungan yang relevan dengan bagian aktif. Penurunan ECL merupakan hipotesis penelitian yang perlu dievaluasi, bukan hasil yang dijamin implementasi.

Panel menjadi bagian alur halaman pada layar kecil, bukan overlay. Tombol Lihat bantuan memindahkan fokus ke panel ketika diminta pengguna. Penutupan mengembalikan fokus ke tombol bantuan. Pada ASSISTED, menutup panel memakai manual override RETURN_DEFAULT yang sudah ada: tampilan kembali normal dan mengikuti cooldown sebelumnya.

## Kesamaan konten dan snapshot

`contextual-content.ts` memetakan `materialId` → `sectionId` → istilah, contoh, dan ringkasan untuk empat subbab Sampling Bias dan empat subbab Correlation vs Causation. Definisi istilah memakai glosarium materi yang sama. Contoh/ringkasan disusun dari kasus yang sudah ada; tidak ada pemanggilan AI saat runtime.

`content.ts` menggabungkan bantuan tersebut ke `section.support`. Sesi baru menyimpan seluruh isi bantuan dalam snapshot materi bersama artikel dan diagram. Bantuan yang sama dapat diakses pada DEFAULT/NON_ADAPTIVE; membuka bantuan manual tidak mengubah kondisi atau mode mesin menjadi ASSISTED. Paragraf asli, diagram, dan soal tidak diubah.

Gunakan **sesi TEST baru** untuk melihat konten bantuan lengkap. Sesi lama tetap memakai snapshot lama. Jika `support` belum ada, pembaca menampilkan keterangan ketersediaan, bukan mengambil konten dari versi baru. Jangan mencampur ekspor versi materi/aplikasi lama dan baru; pemeriksaan versi utilitas penggabungan tetap berlaku.

## Posisi, progress, dan aksesibilitas

- Bagian aktif mengikuti posisi scroll pada DEFAULT. FOCUS/ASSISTED mempertahankan bagian tersebut; bagian lain tetap ada di DOM dalam keadaan hidden.
- Posisi paragraf ditangkap sebelum perubahan layout dan dipulihkan setelah reflow, termasuk perubahan lebar akibat sidebar. Pengguna tetap dapat menghentikan penyesuaian dengan input scroll/keyboard/pointer.
- Previous/Next dan outline memindahkan fokus ke heading bagian yang dipilih. Pengantar tersedia sebagai langkah terpisah sebelum empat subbab.
- Bagian aktif, bagian yang pernah dibuka, dan anchor baca disimpan di sessionStorage dengan kunci sesi/blok. Ini preferensi antarmuka pada tab/browser, bukan hasil asesmen. Browser baru tidak memulihkan preferensi ini dari server.
- Angka progress berarti **subbab pernah dibuka**, bukan bukti telah dibaca/dipahami; tidak ditambahkan syarat baru untuk menyelesaikan belajar.
- Bantuan memakai expandable sections native (`details`/`summary`) yang dapat digunakan dengan keyboard. Tidak ada animasi masuk besar atau perpindahan scroll ke awal secara otomatis saat mode berganti.
- Pemulihan posisi bekerja pada tingkat elemen/paragraf. Pemenggalan baris dapat berubah mengikuti lebar layar; ketepatan posisi perlu diperiksa pada browser dan ukuran layar lab yang digunakan.

## Integrasi dan log

Model FER, pemetaan emosi, confidence, window, persistence, cooldown, dan state machine tidak diubah. DEFAULT → FOCUS tetap melalui aturan temporal; ASSISTED tetap memerlukan penerimaan tawaran. NON_ADAPTIVE tetap DEFAULT.

Event lama tetap mencatat transisi mode, tawaran bantuan, penerimaan/penolakan, manual override, dan durasi DEFAULT/FOCUS/ASSISTED dalam MINUTE_SUMMARY. Event pembaca baru masuk melalui antrean dan journal yang sama:

- `READING_SECTION_CHANGED`: bagian sebelumnya, bagian baru, dan alasan navigasi/scroll/pemulihan.
- `READING_PRESENTATION_CHANGED`: penyajian aktual dan penggunaan pembacaan per bagian.
- `CONTEXTUAL_PANEL_OPENED` / `CONTEXTUAL_PANEL_CLOSED`: pembukaan/penutupan panel.
- `CONTEXTUAL_HELP_TOGGLED`: kategori terms/example/summary dan status buka/tutup.

Event pembaca membawa material, bagian/target, mode mesin, sumber REAL/SIMULATION, dan waktu. Event rinci tersedia pada ekspor JSON; format penyimpanan dan CSV durasi mode tidak diganti. Durasi mode menunjukkan paparan mode, bukan waktu panel benar-benar masuk viewport atau waktu memperhatikan bantuan.

## Pemeriksaan manual oleh peneliti

1. Buat sesi TEST baru profil PILOT_A, urutan 1/3 agar blok pertama ADAPTIVE. Jalankan development seperti panduan alur penelitian.
2. Pada DEFAULT, baca sampai tengah subbab kedua. Coba bantuan manual, ketiga expandable sections, glosarium, dan navigasi keyboard.
3. Jalankan simulasi Anger dengan confidence 0,90. Setelah window valid, periksa bahwa FOCUS tetap berada pada subbab/paragraf yang sedang dibaca, sidebar hilang, dan Previous/Next bekerja.
4. Biarkan kondisi pemicu berlanjut melewati cooldown hingga tawaran bantuan muncul. Tolak terlebih dahulu; panel tidak boleh terbuka karena penolakan. Pada tawaran berikutnya, terima dan periksa bantuan subbab aktif di ASSISTED.
5. Pindah subbab, periksa perubahan bantuan. Tutup panel dan periksa kembali ke DEFAULT serta posisi/fokus. Coba keluar Focus dan nonaktifkan adaptasi menggunakan kontrol lama.
6. Pada blok NON_ADAPTIVE, periksa artikel tetap DEFAULT dan bantuan yang sama tersedia manual. Selesaikan posttest dan CLT seperti alur sebelumnya.
7. Coba refresh, navigasi course lalu kembali, layar kecil, zoom browser, dan prefers-reduced-motion. Periksa JSON untuk event baru serta MINUTE_SUMMARY modeMs.

## File utama

- `src/features/research/material-reader.tsx`: pembaca, navigasi, posisi bagian, akses manual.
- `src/features/research/reading-position.tsx`: pemulihan anchor sebelum/sesudah perubahan layout.
- `src/features/research/contextual-help.tsx`: panel bantuan reusable.
- `src/features/research/contextual-content.ts`: pemetaan bantuan delapan subbab.
- `src/features/research/content.ts`: snapshot bantuan bersama materi.
- `src/features/research/material-diagram.tsx`: diagram lama yang dipindahkan tanpa mengubah isinya.
- `src/features/research/material-view.tsx`: titik ekspor kompatibel untuk pemanggil lama.
- `src/features/research/learning.tsx`: integrasi mode, event, dan manual override penutupan bantuan.
- `src/features/aui/adaptive-controls.tsx`, `adaptive-material.tsx`: teks tawaran dan pembaca pratinjau yang sama.
- `src/features/lms/student-sidebar.tsx`, `student-shell.tsx`: offcanvas penuh dan akses buka navigasi.
- `src/features/research/protocol.ts`: identitas versi aplikasi/materi.

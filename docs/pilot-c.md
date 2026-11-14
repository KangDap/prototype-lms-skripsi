# Profil temporal PILOT_C

**Pembaruan aktif:** Default sesi baru dan alokasi aktif kini memakai [PILOT_D](pilot-d.md). PILOT_A/B/C tetap tersedia, memakai windowing yang sama dan hanya berbeda confidence 0,60/0,50/**0,40**. Lihat [panduan perbandingan confidence dan penggantian profil](fer-confidence-pilot.md). Uraian versi sebelumnya di bawah merupakan riwayat; sesi lama tidak diubah.

Parameter pilot sementara, diperbarui 14 November 2026, belum konfigurasi final penelitian. PILOT_C menjadi pilihan awal pembuatan sesi manual TEST/PILOT dan konfigurasi alokasi TEST bawaan. BASELINE, PILOT_A, dan PILOT_B tetap tersedia. MAIN tetap memerlukan pemilihan profil dan persetujuan yang sudah ada. Lihat [laporan revisi](revision-2026-11-14.md).

| Parameter | Nilai |
|---|---:|
| Window terpisah, tidak saling tumpang tindih | 5 detik |
| Interval sampling FER | 1 detik |
| Minimum sampel valid | 4 |
| Confidence minimum | 0,40 |
| Rasio negatif / stable | 0,60 / 0,60 |
| Persistence negatif / stable | 2 / 2 window |
| Cooldown | 30 detik |
| Recovery delay | 1 detik |

Rasio dihitung terhadap sampel valid. no_face, unknown, error, prediksi tidak valid, dan confidence < 0,40 pada PILOT_C tidak masuk pembilang maupun penyebut. PILOT_A/B memakai batas confidence masing-masing 0,60/0,50. Surprise tetap valid dalam penyebut, tetapi bukan negatif atau stable. Window dengan < 4 sampel valid menjadi UNKNOWN dan memutus persistence. Window tidak dominan juga memutus persistence. Batas window menggunakan waktu pengambilan [start, end).

Dalam kondisi ideal: window negatif pertama selesai pada detik 5, kedua pada detik 10 membuka tawaran modal. DEFAULT tetap aktif sampai peserta memilih FOCUS atau ASSISTED; TIDAK mempertahankan DEFAULT. Mode tidak berurutan dan bisa diganti manual kapan saja. Cooldown setelah pilihan 30 detik; suppression tawaran ditolak/ditutup/diabaikan 30 detik. Timeout sementara 30 detik, dapat dikonfigurasi di USER_APPROVED_CONFIG. Recovery sinyal memerlukan dua window stable berturut-turut, cooldown selesai, lalu delay 1 detik; tidak membatalkan mode pilihan pengguna. Manual override membuang window parsial.

Interval 1 detik merupakan jeda sampling terjadwal; request inferensi berjalan bergantian sehingga latensi inferensi dapat membuat jarak capture lebih panjang. Lima detik tidak menjamin lima sampel. Sampel terlambat dan tab tersembunyi tidak dipakai untuk memaksa trigger.

Sesi baru menyimpan profileId dan snapshot parameter. Sesi lama atau sesi yang dipulihkan mempertahankan snapshot lama. Untuk mencoba PILOT_C, buat sesi TEST baru dengan kode yang belum dipakai, pilih urutan 1/3 untuk ADAPTIVE terlebih dahulu. Pengaturan profil tersedia di Ruang peneliti → Pengaturan & responden → Konfigurasi alokasi atau pembuatan sesi manual. Simpan pilihan sebelum membuat sesi. Jangan mengubah parameter saat pengumpulan data utama berlangsung.

Debug AUI hanya tampil untuk TEST ADAPTIVE pada development dan AUI_RESEARCH_MODE bukan true. Panel menampilkan profil yang cocok dengan snapshot, mekanisme, seluruh parameter, jumlah sampel, rasio berjalan, hasil window final, persistence, cooldown, timeout/suppression dan alasan keputusan. Hitungan persistence dapat kembali nol setelah tawaran/pilihan. Saat pemeriksaan mandiri, simulasi Anger 0,90 seharusnya membuka tawaran sekitar 10 detik dalam kondisi ideal, bukan langsung FOCUS. Konfigurasi yang tidak cocok profil dikenal ditandai snapshot khusus/legacy.

Source pengujian otomatis telah disesuaikan untuk minimum empat valid dan pilihan langsung pengguna, termasuk penolakan/timeout, suppression, recovery yang mempertahankan mode dan NON_ADAPTIVE. Snapshot bertahap lama tetap mempunyai pengujian regresinya. **Pengujian revisi ini tidak dijalankan**, sesuai instruksi peneliti; lakukan pemeriksaan mandiri sebelum pilot.

Hasil pemeriksaan 13 November adalah riwayat versi minimum tiga sampel dan engine bertahap. Hasil tersebut tidak menjadi bukti bahwa revisi 14 November sudah berjalan atau lulus pengujian.

# Perbandingan confidence pilot

PILOT_A/B/C membandingkan confidence 0,60, 0,50 dan 0,40 dengan parameter lain tetap sama. Ini parameter pengujian sementara, belum konfigurasi final penelitian. BASELINE tetap konfigurasi referensi lama. Default dan alokasi aktif kini menggunakan [PILOT_D](pilot-d.md) untuk pengujian akumulasi negatif; parameter A/B/C di bawah tetap tersedia dan tidak berubah.

| Parameter | PILOT_A | PILOT_B | PILOT_C |
|---|---:|---:|---:|
| Window | 5 detik | 5 detik | 5 detik |
| Sampling interval | 1 detik | 1 detik | 1 detik |
| Minimum valid samples | 4 | 4 | 4 |
| Confidence minimum | 0,60 | 0,50 | 0,40 |
| Negative ratio | 0,60 | 0,60 | 0,60 |
| Consecutive negative windows | 2 | 2 | 2 |
| Stable ratio | 0,60 | 0,60 | 0,60 |
| Consecutive stable windows | 2 | 2 | 2 |
| Adaptation cooldown | 30 detik | 30 detik | 30 detik |
| Recovery delay | 1 detik | 1 detik | 1 detik |
| Dialog timeout | 30 detik | 30 detik | 30 detik |
| Offer suppression | 30 detik | 30 detik | 30 detik |

Parameter selain confidence berasal dari satu konfigurasi bersama di `src/features/aui/config.ts`. BASELINE tidak diubah: window 10 detik, minimum 8 valid, confidence/rasio 0,60, persistence negatif/stable 2/2, cooldown 30 detik, recovery 1 detik; fallback stable persistence tetap mengikuti aturan lama.

## Mengganti profil

Untuk masuk melalui kode peserta/PC: **Ruang peneliti → Pengaturan & responden → Konfigurasi alokasi → Profil parameter AUI**. Pilih PILOT_A/B/C, naikkan versi konfigurasi, lalu simpan. Perubahan berlaku pada sesi baru. Pada beberapa PC localhost, distribusikan konfigurasi yang sama ke setiap PC yang hendak memakai profil tersebut.

Alternatif edit berkas `config/research-allocation.json`: ubah `profileId` menjadi PILOT_A, PILOT_B atau PILOT_C, lalu naikkan `version`. Jangan mengganti daftar peserta, PC, urutan, atau status persetujuan MAIN hanya untuk mengganti threshold. Alokasi saat revisi masih PILOT_C; daftar alokasi yang sudah disiapkan tidak ditimpa.

Untuk pembuatan sesi manual, pilih profil pada form Buat sesi di halaman yang sama. Pilihan form manual hanya berlaku bagi sesi yang dibuat lewat form itu; tidak mengganti profil roster masuk. `DEFAULT_PILOT_PROFILE` adalah pilihan awal/fallback, bukan pengganti `profileId` eksplisit pada roster. MAIN tetap mengikuti mekanisme persetujuan profil yang telah tersedia.

## Sampling dan snapshot

Ketiga PILOT memakai nilai sampling 1000ms dari profil ketika membuat snapshot, meskipun environment NEXT_PUBLIC_FER_INTERVAL_MS berbeda. BASELINE mempertahankan perilaku environment yang sudah ada. FERProvider untuk sesi penelitian memakai `study.config.samplingIntervalMs`; konfigurasi lama yang sudah tersimpan tidak diperbarui ketika dipulihkan. Inferensi tetap berurutan, sehingga latensi request dapat menambah jarak capture di luar jeda terjadwal 1 detik.

Setiap record baru menyimpan profileId serta seluruh config (confidence, window, minimum valid, timeout, suppression, dan policy USER_APPROVED_V1). Pemulihan sesi lama tidak menggabungkan nilai profil terbaru ke snapshot lama. Karena itu, buat sesi baru dengan kode yang belum digunakan untuk memeriksa threshold baru. Jangan menyimpulkan konfigurasi historis hanya dari nama profil: PILOT_A/B/C pernah mempunyai parameter berbeda.

## Informasi debug

Pada TEST ADAPTIVE dalam development, panel debug menampilkan ID profil sesi dan **Confidence threshold profil** dalam angka dua desimal serta persentase. Confidence prediksi terakhir ditampilkan terpisah. Snapshot lama yang berbeda dari definisi profil terkini diberi penanda 'snapshot lama/khusus'; ID profil tidak ditebak ulang menjadi profil lain hanya karena angka parameternya sama.

FER-triggered user-approved AUI tetap dipakai: dua window negatif yang memenuhi syarat dapat membuka tawaran sekitar 10 detik dalam kondisi ideal. Pengguna memilih FOCUS, ASSISTED, atau tetap DEFAULT. Recovery tidak membatalkan mode pilihan. Model, label, mapping, inferensi, data responden dan mekanisme penyimpanan tidak diubah.

## Perubahan dan pemeriksaan

Diubah: `src/features/aui/config.ts`, `src/features/research/store.ts`, `src/features/aui/adaptive-provider.tsx`, `src/features/aui/aui-debug-panel.tsx`, `src/features/research/material-page.tsx`, `config/research-allocation.json` (hanya versi alokasi), serta ekspektasi parameter pada source `scripts/test-aui.cjs`. Dokumentasi PILOT_C dan alur penelitian ditautkan ke panduan ini.

Pemeriksaan hanya melalui pembacaan source. Tidak menjalankan aplikasi, build, lint, typecheck, test, server atau simulasi FER; tidak membuat data baru, commit atau push. Source tes konfigurasi disesuaikan tetapi belum dijalankan. Untuk pemeriksaan manual oleh peneliti, bandingkan panel/snapshot pada sesi baru A/B/C dan pastikan hanya confidence yang berbeda, termasuk ketika environment interval diatur berbeda. Periksa pula bahwa pemulihan sesi lama masih menampilkan snapshot lamanya.

# PILOT_D — negative occurrence accumulation

PILOT_D adalah konfigurasi aktif sementara untuk sesi baru, melalui default kode dan alokasi `allocation-occurrence-v1`. Jenis alokasi tetap PILOT. Parameter ini eksperimental dan belum tervalidasi secara ilmiah. BASELINE dan PILOT_A/B/C tidak diubah. Tidak ada data sesi lama atau snapshot lama yang dimigrasikan.

| Parameter | PILOT_C | PILOT_D |
|---|---:|---:|
| Window non-overlapping | 5.000 ms | 10.000 ms |
| Interval sampling | 1.000 ms | 1.000 ms |
| Minimum valid | 4 | 7 |
| Confidence minimum | 0,40 | 0,40 |
| Minimum negatif | Tidak ditetapkan terpisah | 3 |
| Rasio negatif / valid | 0,60 | 0,30 |
| Window negatif berturut-turut | 2 | 1 |
| Rasio stable | 0,60 | 0,60 |
| Window stable berturut-turut | 2 | 2 |
| Cooldown | 30.000 ms | 30.000 ms |
| Recovery delay | 1.000 ms | 1.000 ms |
| Dialog timeout | 30.000 ms | 30.000 ms |
| Offer suppression | 30.000 ms | 30.000 ms |

## Evaluasi window

PILOT_D menggunakan `negativeWindowPolicy: OCCURRENCE_ACCUMULATION` dan `minNegativeSamples: 3`. Sampel negatif boleh berbeda label dan terseling sampel lain. Anger, Contempt, Disgust, Fear, Sadness tetap kelompok negatif; Neutral/Happiness stable; Surprise ambiguous. Semua dihitung valid jika prediksi sah dan confidence minimal 0,40. no_face, error, prediksi tidak valid, dan confidence rendah tidak masuk penyebut rasio.

Window selesai dikategorikan INVALID jika valid < 7; jika cukup valid, NEGATIVE apabila negatif >= 3 dan negatif/valid >= 0,30; berikutnya STABLE apabila rasio stable >= 0,60; sisanya OTHER. NEGATIVE diprioritaskan ketika ambang negatif dan stable sama-sama tercapai, sehingga 3 negatif + 6 stable + 1 ambiguous tetap dapat memicu tawaran. Log menyimpan kedua flag kualifikasi dan alasan prioritas ini.

Contoh: 3/7 dan 3/10 memenuhi; 2/7 tidak; 4/6 INVALID. Evaluasi terjadi setelah window selesai, bukan ketika hitungan ketiga tercapai. Sampel mengikuti bucket waktu capture [awal, akhir), hanya sekali. Hitungan negatif tidak dibawa ke window berikutnya. Mekanisme penanganan jeda timer lama tetap: window kedaluwarsa tidak memicu tawaran, gap panjang diringkas oleh window kosong terakhir. Window parsial dibuang saat input berhenti atau manual override sebagaimana sebelumnya.

## State machine dan logging

Window negatif hanya menawarkan dialog ketika ADAPTIVE, enabled, DEFAULT, belum ada tawaran, dan cooldown/suppression selesai. Mode tetap DEFAULT sampai peserta memilih FOCUS/ASSISTED; penolakan, penutupan dan timeout mempertahankan DEFAULT serta suppression. Recovery dua window stable memulihkan sinyal tanpa membatalkan mode pilihan pengguna. NON_ADAPTIVE tetap mencatat FER/window dan tidak menawarkan adaptasi.

`AFFECTIVE_WINDOW_EVALUATED` menyimpan total/valid/negative/stable/ambiguous, rasio, status, reason, dan flag negativeQualified/stableQualified. Waktu awal/akhir tersedia sebagai waktu monoton episode dan ISO (`startedAtIso`, `endedAtIso`). `state` lama dipertahankan untuk kompatibilitas: NEGATIVE_AFFECT, STABLE, AMBIGUOUS, UNKNOWN masing-masing mewakili NEGATIVE, STABLE, OTHER, INVALID.

`AUI_TRIGGER_ELIGIBILITY` mencatat keputusan aktual engine, alasan, blocker, kondisi, enabled, mode, status tawaran, dan sisa cooldown. Blocker mencakup window invalid/tidak negatif/kedaluwarsa/duplikat, NON_ADAPTIVE, adaptasi nonaktif, mode bukan DEFAULT, dialog terbuka, dan cooldown/suppression. Event ini tersedia pada JSON serta CSV AUI-EVENTS; CSV menambah status/alasan window dan kolom eligibility. Karena keputusan ditulis untuk setiap window D, AUI-EVENTS dapat berisi baris meskipun tidak pernah ada tawaran. Event ini bukan bukti tawaran ditampilkan; gunakan ADAPTATION_OFFER_SHOWN untuk itu.

Snapshot sesi baru menyalin seluruh profil, termasuk minNegativeSamples, policy, timeout, suppression dan interactionPolicy. Label sumber REAL/SIMULATION dan event lama tetap dipertahankan. Tidak ada foto/video yang ditambahkan. Storage lokal dan pipeline pengiriman event tidak diubah.

## Mengganti profil

Di pengaturan peneliti, buka konfigurasi alokasi, pilih PILOT_C atau PILOT_D, perbarui versi alokasi, lalu simpan. Alternatif sebelum deployment: ubah `profileId` dan `version` pada `config/research-allocation.json`. Default untuk pembuatan sesi tanpa pilihan eksplisit ada pada `DEFAULT_PILOT_PROFILE` di `src/features/aui/config.ts`; pilihan alokasi eksplisit tetap diutamakan. Profil pada form sesi manual hanya mengatur sesi manual tersebut.

Gunakan sesi baru untuk pergantian profil. Melanjutkan sesi lama tetap memakai snapshot lama. Semua profil pilot memakai interval dari profil, bukan environment override. Panel Debug AUI menampilkan profil, confidence, minimum negatif, hasil window dan eligibility; pembatasan debug TEST/ADAPTIVE/development tetap berlaku. Roster PILOT tidak otomatis membuka debug.

## Pemeriksaan manual oleh peneliti

- Pastikan sesi baru menyimpan PILOT_D, minValid 7, minNegative 3, confidence 0,40 dan interval 1 detik.
- Periksa kasus 3/7, 3/10, 2/7, 4/6 dan campuran negatif/stable/Surprise pada log window selesai.
- Pastikan dialog meminta persetujuan, penolakan/timeout tersupresi, mode pilihan bertahan, dan NON_ADAPTIVE tidak mendapat tawaran.
- Periksa JSON dan AUI-EVENTS, timestamp, sumber REAL/SIMULATION dan alasan eligibility.
- Ganti ke PILOT_C dengan sesi baru; pastikan aturan 5 detik, minimum 4, rasio 60%, dua window tetap berlaku. Pastikan sesi lama mempertahankan snapshot sebelumnya.

Interval 1 detik tidak menjamin sepuluh hasil per window: latensi inferensi, tab tersembunyi, wajah tidak terdeteksi dan confidence rendah dapat mengurangi sampel valid. Tawaran sekitar 10 detik hanya mungkin dalam kondisi ideal.

Implementasi diperiksa melalui pembacaan kode. Aplikasi, build, lint, test dan simulasi tidak dijalankan. Skenario uji ditambahkan ke `scripts/test-aui.cjs` untuk dijalankan peneliti nanti. Tidak ada commit/push maupun penghapusan data.

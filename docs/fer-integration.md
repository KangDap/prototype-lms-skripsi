# Panduan integrasi FER yang sudah tersedia

Dokumen ini direkonstruksi dari audit kode karena berkas yang ditautkan README belum tersedia pada checkout awal pekerjaan AUI. Layanan inferensi tidak dibuat ulang. Untuk agregasi/adaptasi yang ditambahkan di atasnya, lihat [Rule-Based AUI](aui-rule-base.md).

## Arsitektur

Pada sesi penelitian, browser meminta FER aktif otomatis ketika masuk fase belajar materi. Izin kamera bawaan browser tetap diperlukan saat belum diberikan; tidak ada tombol aktivasi atau persetujuan tambahan di aplikasi. Halaman FER mandiri tetap menyediakan kontrol manual. `FERSession` mengirim JPEG 640×480 melalui HTTP ke FastAPI lokal. `services/fer/pipeline.py` memakai EmotiEffLib 1.1.1 dengan `enet_b0_8_best_vgaf`, engine ONNX CPU, dan Haar Cascade default. Jika beberapa wajah terdeteksi, wajah terbesar diproses.

Delapan label asli: Anger, Contempt, Disgust, Fear, Happiness, Neutral, Sadness, Surprise. Status no_face dan invalid_prediction memiliki emotion/confidence/probabilities null. Client memvalidasi versi kontrak, metadata, label, dan konsistensi probabilitas sebelum memublikasikan sampel.

Tidak ada perekaman audio atau penyimpanan raw image/video. Frame hanya dipakai untuk inferensi. Browser menghentikan kamera dan membatalkan request ketika stop, error, tab tersembunyi, pagehide, atau meninggalkan materi. Token generation menolak hasil async yang terlambat.

## Menjalankan layanan lokal

Pembaruan 12 November 2026: setup dan launcher mandiri sekarang tersedia pada [lab-setup.md](lab-setup.md). Setelah pengguna menjalankan setup, `pnpm.cmd lab` atau `pnpm.cmd lab:dev` memakai interpreter `services/fer/.venv`, bukan environment `fer-playground`. Script belum dijalankan pada revisi ini; petunjuk environment lama di bawah tetap dapat dipakai untuk startup manual yang sebelumnya sudah berjalan.

Environment yang sudah tersedia pada workspace ini berada di `fer-playground/.venv`, bukan `services/fer/.venv`. Dari root `prototype-lms-skripsi`, gunakan:

```powershell
& "..\fer-playground\.venv\Scripts\python.exe" -m uvicorn app:app --app-dir services/fer --host 127.0.0.1 --port 8000
```

Provider kamera berada pada layout LMS agar indikator wajah tersedia di semua halaman. Kamera hanya aktif selama fase belajar dan berhenti pada evaluasi maupun halaman lain. Tidak ada preview/persiapan kamera tambahan pada alur responden; lihat [alur LMS penelitian](research-flow.md).

Gunakan environment Python yang sebelumnya sudah berhasil untuk FER. Jika menyiapkan environment baru, jalankan dari root aplikasi:

```powershell
python -m venv services/fer/.venv
services/fer/.venv/Scripts/python.exe -m pip install -r services/fer/requirements.txt
services/fer/.venv/Scripts/python.exe -m uvicorn app:app --app-dir services/fer --host 127.0.0.1 --port 8000
```

Model harus sudah tersedia di cache pengguna Python yang menjalankan layanan:

```text
~/.emotiefflib/enet_b0_8_best_vgaf.onnx
```

Service sengaja gagal dengan pesan eksplisit bila model tidak ada; tidak mengunduh model saat startup. Jangan mengganti model atau urutan label tanpa memperbarui kontrak dan validasinya. Tidak ada import runtime dari `fer-playground`.

Di terminal lain:

```powershell
pnpm.cmd dev
```

Salin pengaturan `.env.example` ke `.env.local` bila diperlukan. API URL default `http://127.0.0.1:8000`. Jeda default kini 1000 ms setelah request selesai, timeout 10000 ms. Capture dan inferensi serial; latensi membuat interval hasil aktual lebih panjang. AUI tidak mengasumsikan jumlah hasil selalu 10 per window.

Origin default yang diizinkan service adalah `http://localhost:3000` dan `http://127.0.0.1:3000`. Untuk port lain, atur `FER_ALLOWED_ORIGINS` pada terminal Python sebelum startup; daftar dipisahkan koma, tanpa wildcard. Browser memerlukan localhost atau HTTPS untuk kamera.

## Endpoint dan opsi detector

- `GET /health`: status ready, versi schema, model, detector, dan urutan labels.
- `POST /predict`: body `image/jpeg`, maksimal 1 MB. Respons menyertakan status, face_count, label/confidence/probabilities bila valid, timestamp UTC dan latency_ms.
- Default `FER_DETECTOR=haar`. Opsi `mediapipe` membutuhkan paket MediaPipe yang sesuai dan `FER_FACE_MODEL` yang menunjuk model detector lokal; lihat konfigurasi existing di `pipeline.py`. AUI tidak mengubah opsi tersebut.

## Verifikasi dan troubleshooting

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
node scripts/test-fer.cjs
```

Delapan regression test browser-session/HTTP contract dapat dijalankan tanpa kamera nyata. Pengujian Python existing ada pada `services/fer/test_api.py`; dependency pengujian tercantum di `requirements-dev.txt`.

Jika izin kamera ditolak, aktifkan izin pada browser dan coba lagi. Jika kamera digunakan aplikasi lain, tutup aplikasi tersebut. Jika service terputus/timeout, kamera dihentikan dan materi tetap dapat dibaca; periksa terminal Python dan CORS origin sebelum mengaktifkan kembali. Restart FER selalu memulai window agregasi baru.

Pada development gunakan panel Debug AUI untuk melihat raw prediction dan agregasi. Panel tidak tersedia pada production, research mode, atau kondisi NON_ADAPTIVE. Confidence adalah keluaran model, bukan pengukuran cognitive load atau kebingungan.

# Paket localhost untuk PC lab

Revisi 12 November 2026. Hanya berkas kode, konfigurasi contoh, script, dan dokumentasi yang ditambahkan/diedit. Setup, instalasi, aplikasi, build, lint, typecheck, dan tes belum dijalankan pada revisi ini sesuai permintaan pengguna.

## Siapkan konfigurasi sekali

1. Saat LMS dijalankan oleh peneliti, buka ikon pengaturan pada halaman masuk atau menu profil bawah → Pengaturan penelitian.
2. Masukkan password yang sama dengan `RESEARCHER_KEY` pada `.env.local`.
3. Buka **Konfigurasi alokasi peserta**. Isi kode PC yang diizinkan, daftar kode peserta, urutan 1–4, jenis sesi, dan profil AUI. Peserta tidak mengisi atau memilih kondisi UI.
4. Naikkan versi konfigurasi ketika mengubah isinya, lalu tekan **Simpan konfigurasi**.
5. Hasil tersimpan pada `config/research-allocation.json`. Berkas yang sama disertakan ke seluruh salinan proyek untuk PC lab. Ekspor JSON draf tersedia bila ingin menyiapkan berkas terpisah; ekspor draf tidak otomatis menyimpan perubahan ke server.

Konfigurasi bawaan hanya contoh pemeriksaan teknis: urutan awal `TEST001`–`TEST004` adalah 1–4, PC `LAB01`–`LAB04`, jenis TEST, profil PILOT_C. Lihat [parameter pilot](pilot-c.md) dan versi alokasi pada berkas konfigurasi aktif. Ganti daftar/versinya sesuai rancangan sebelum penelitian. Penentuan pembagian peserta tetap dilakukan peneliti; aplikasi tidak mengacak, membagi berdasarkan PC, atau menyesuaikan urutan secara otomatis.

| Urutan | Pertama | Kedua |
|---|---|---|
| 1 | A (Sampling Bias), Adaptive | B (Correlation vs Causation), Non-Adaptive |
| 2 | A, Non-Adaptive | B, Adaptive |
| 3 | B, Adaptive | A, Non-Adaptive |
| 4 | B, Non-Adaptive | A, Adaptive |

Kind TEST/PILOT/MAIN berlaku untuk daftar pada berkas itu. Status `profileApprovedForMain` hanya menyatakan pemilihan profil berdasarkan pilot; tidak menggantikan persetujuan instrumen dan metodologi. MAIN tetap diblokir sampai redaksi CLT dan protokol siap. `RESEARCH_MAIN_PROFILE` lama boleh dikosongkan jika memakai persetujuan profil dari berkas alokasi. Jika override environment berbeda dari profil alokasi MAIN, masuk peserta ditolak sampai konfigurasi disamakan.

## Alur peserta

- Buka `http://localhost:3000/`. Tampilan normal hanya dua kolom **Kode peserta**, **Kode PC**, tombol **Masuk**, serta ikon pengaturan tanpa teks tambahan.
- Kode dinormalisasi ke huruf kapital. Contoh: `test001` dan `lab01` cocok dengan `TEST001` dan `LAB01`.
- Backend lokal membaca konfigurasi privat dan menentukan urutan, jenis sesi, serta profil. Request peserta tidak boleh membawa pilihan AUI atau parameter eksperimen.
- Kode tidak terdaftar/nonaktif dan kode PC tidak diizinkan ditolak. Satu kode PC adalah label komputer yang digunakan; tidak menentukan urutan materi.
- Peserta masuk ke dashboard, membuka course/materi yang tersedia, lalu menjalani pretest → belajar → posttest → CLT pada halaman materi. Tidak ada guidance atau layar persetujuan aplikasi. FER aktif otomatis saat belajar, dengan izin kamera bawaan browser. Setelah CLT dikirim, peserta kembali ke course untuk materi berikutnya. CLT sudah memuat 15 redaksi draf peneliti; TEST/PILOT dapat digunakan untuk mencoba, MAIN tetap memerlukan persetujuan.
- Retry permintaan masuk memakai ID dan secret yang sama untuk menghindari sesi ganda ketika respons hilang. Jika jaringan bermasalah, ulangi kode yang sama pada browser/tab yang sama.
- Kode yang sudah mempunyai sesi selesai/dihentikan tidak membuat sesi baru lewat form masuk. Sesi aktif hanya dapat dilanjutkan melalui browser yang masih memiliki akses sesi atau dipulihkan oleh peneliti. Mengetahui kode peserta saja tidak memulihkan akses sesi aktif di browser lain.
- Pilih **Keluar** pada menu profil sebelum menyerahkan PC ke peserta berikutnya. Aplikasi menyimpan checkpoint pembelajaran dan mengirim antrean sebelum melepas sesi browser. Keluar tidak menghapus hasil disk dan tidak mengirim jawaban kosong otomatis. Sesi belum selesai tetap dapat dipulihkan peneliti.
- Halaman LMS memerlukan sesi; pengaturan tetap dapat dibuka tanpa sesi peserta, dengan password.

Server menyimpan versi dan digest konfigurasi pada setiap sesi baru. Perubahan konfigurasi berlaku untuk peserta baru; sesi lama memakai snapshot yang sudah tersimpan. Versi/digest juga ada pada ekspor CSV/JSON.

Karena server berjalan independen per PC, validasi duplikasi hanya mencakup data di PC tersebut. Pembagian kode secara unik dan pencatatan peserta lintas PC tetap dikelola peneliti dalam daftar induk. Mengubah berkas pada satu PC tidak memperbarui PC lain otomatis.

## Paket FER mandiri

Backend FER sudah berada di `services/fer`. Script baru tidak mengimpor kode atau memakai interpreter dari `fer-playground`.

Prasyarat tiap PC: Windows, Python 3.11, Node.js yang sesuai proyek (disarankan menyamakan versi Node 22 yang dipakai prototipe), pnpm sesuai `packageManager`, dan webcam. Environment Python dibuat ulang pada PC tujuan; jangan membagikan folder `.venv` dari PC peneliti.

Sertakan model yang sama pada:

```text
services/fer/models/enet_b0_8_best_vgaf.onnx
```

Model binary tidak ditambahkan Git dan tidak diunduh otomatis oleh script. Jika model pada PC peneliti masih berada di cache akun Windows `.emotiefflib`, setup bisa menyalinnya ke folder model paket. Pada PC tujuan, setup menyalin model paket ke cache akun Windows karena EmotiEffLib 1.1.1 membaca lokasi tersebut. Model berbeda tidak ditimpa diam-diam; SHA-256 ditampilkan/dicatat saat setup.

Dari root `prototype-lms-skripsi`, jalankan sendiri:

Hentikan layanan Next.js/FER lama sebelum setup/build dan sebelum memakai launcher gabungan.

```powershell
pnpm.cmd lab:setup
```

Atau tentukan interpreter dan model secara eksplisit:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-lab.ps1 -PythonExecutable "C:\path\Python311\python.exe" -ModelPath "C:\path\enet_b0_8_best_vgaf.onnx"
```

Setup membuat `services/fer/.venv`, memasang kebutuhan Python, memasang dependensi LMS dengan lockfile, dan membangun LMS. Jika `.env.local` belum ada, template disalin; isi password peneliti sebelum membuka pengaturan. `-SkipBuild` tersedia untuk persiapan development. Instalasi paket dan build font memerlukan koneksi saat setup; script belum dijalankan atau diverifikasi pada revisi ini.

Versi paket FER utama dikunci berdasarkan metadata environment yang sebelumnya digunakan: EmotiEffLib, OpenCV, ONNX, ONNX Runtime, NumPy, Pillow, Pydantic, Starlette, FastAPI, dan Uvicorn. Ini bukan klaim bahwa instalasi baru telah diuji.

Setelah setup selesai, jalankan sendiri:

```powershell
pnpm.cmd lab
```

Untuk development:

```powershell
pnpm.cmd lab:dev
```

Launcher memakai interpreter dari `services/fer/.venv`, memeriksa kesamaan model paket/cache, menyalakan FER di `127.0.0.1:8000`, menunggu health endpoint, lalu menyalakan LMS di port 3000. Buka `http://localhost:3000`. `Ctrl+C` menghentikan proses yang diluncurkan script; proses lain yang sudah memakai port tidak dihentikan. Launcher memakai port standar; pengaturan URL FER saat build harus tetap `http://127.0.0.1:8000`.

## Membagikan ke lab

Sertakan source proyek, lockfile, `config/research-allocation.json` yang sudah final, model ONNX, dan konfigurasi environment yang diperlukan. `.env.local` memuat password dan tidak dimasukkan Git. Siapkan paket untuk penggunaan lab yang Anda kelola.

Jangan menyertakan `.research-data`, database antrean browser, `node_modules`, `.next`, atau `.venv` dari sesi pengembangan sebagai data responden/paket instalasi. Buat dependensi/build pada PC tujuan dengan setup. Pastikan kode aplikasi, materi, instrumen, dan berkas alokasi sama di semua PC sebelum pengambilan data.

Hasil responden tetap berada di `.research-data` masing-masing PC. Ekspor dan backup setelah sesi sesuai [panduan penelitian](research-flow.md). Penggabungan data tidak menjadi otomatis/terpusat hanya karena konfigurasi alokasinya sama.

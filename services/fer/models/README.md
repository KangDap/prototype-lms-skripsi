# Model lokal untuk paket lab

Sertakan `enet_b0_8_best_vgaf.onnx` yang sama dengan model penelitian pada folder ini sebelum membagikan paket ke PC lab. Binary model tidak dimasukkan Git.

`scripts/setup-lab.ps1` menerima `-ModelPath`, atau menggunakan model yang sudah ada di folder ini. Pada PC peneliti, script juga dapat mengambil file dari cache pengguna `.emotiefflib` yang sudah tersedia. Script menyalin model ke cache akun Windows PC tujuan karena EmotiEffLib 1.1.1 membaca model dari lokasi tersebut.

Script tidak mengunduh model dan tidak mengganti file model berbeda secara diam-diam. Fingerprint SHA-256 dicatat saat setup untuk pemeriksaan kesamaan paket. Inferensi tetap memakai ONNX CPU, delapan label asli, dan Haar sebagai default.

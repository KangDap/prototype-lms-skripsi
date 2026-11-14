import type { MaterialId } from "./types";

export type SectionSupport = { terms: string[]; example: string; summary: string[] };
/** Draft-4 support restates the main lessons; identical access is available in Default. */
export const CONTEXTUAL_SUPPORT: Record<MaterialId, Record<string, SectionSupport>> = {
  "sampling-bias": {
    "populasi-sampel": {
      "terms": [
        "Populasi",
        "Sampel",
        "Populasi sasaran",
        "Kerangka sampel",
        "Sampel terpilih",
        "Responden akhir",
        "Representativitas",
        "Generalisasi"
      ],
      "example": "Misalnya, survei menargetkan seluruh mahasiswa aktif, menggunakan daftar administrasi kampus, memilih 200 mahasiswa, lalu menerima 150 jawaban. Populasinya tetap seluruh mahasiswa aktif; 200 orang merupakan sampel terpilih, sedangkan 150 orang merupakan responden akhir. Jika daftar administrasi belum diperbarui atau kelompok tertentu lebih sulit dihubungi, perbedaan dapat muncul sebelum analisis dilakukan.",
      "summary": [
        "Populasi sasaran, kerangka sampel, sampel terpilih, dan responden akhir merupakan tahap yang berbeda.",
        "Pengambilan sampel menghemat sumber daya, tetapi hasilnya tetap memiliki ketidakpastian.",
        "Representativitas dinilai pada ciri yang relevan; generalisasi memerlukan dasar pemilihan dan respons yang memadai."
      ]
    },
    "sumber-bias": {
      "terms": [
        "Sampling bias",
        "Sampling probabilitas",
        "Sampling nonprobabilitas",
        "Simple random sampling",
        "Stratified sampling",
        "Convenience sampling",
        "Undercoverage",
        "Voluntary response bias",
        "Nonresponse bias"
      ],
      "example": "Voluntary response bias dapat muncul pada undangan terbuka ketika orang dengan pendapat tertentu lebih terdorong menjawab. Sebaliknya, nonresponse bias dapat muncul ketika sebagian unit yang sudah dipilih tidak menjawab dan ketidakikutsertaannya berkaitan dengan topik penelitian. Tidak menjawabnya sebagian undangan merupakan alasan untuk diperiksa, bukan bukti otomatis bahwa bias pasti terjadi.",
      "summary": [
        "Simple random sampling dan stratified sampling menggunakan mekanisme acak yang perlu dijalankan sesuai rancangan.",
        "Komposisi yang mendekati populasi pada satu ciri belum menjamin keterwakilan pada seluruh ciri.",
        "Undercoverage, voluntary response, dan nonresponse terjadi melalui mekanisme berbeda; risikonya bergantung pada kaitannya dengan topik penelitian.",
        "Bias pertanyaan berkaitan dengan pengukuran jawaban dan berbeda dari cara responden dipilih."
      ]
    },
    "evaluasi-survei": {
      "terms": [
        "Estimasi",
        "Representativitas",
        "Sampling variation",
        "Bias sistematis"
      ],
      "example": "Di antara responden yang tinggal jauh, tingkat keluhan adalah 30 / 40 × 100% = 75%. Pada kelompok yang tinggal dekat, tingkatnya 40 / 160 × 100% = 25%. Secara keseluruhan terdapat 70 keluhan dari 200 responden, sehingga persentase keluhan responden adalah (30 + 40) / 200 × 100% = 35%. Angka ini benar untuk data yang terkumpul. Namun, kelompok yang tinggal jauh membentuk 60% populasi dan hanya 20% responden. Jika diasumsikan tingkat keluhan 75% dan 25% benar-benar berlaku pada populasi masing-masing kelompok, penggabungan menurut komposisi populasi menghasilkan 0,60 × 75% + 0,40 × 25% = 55%. Bobot 0,60 dan 0,40 menunjukkan bagian setiap kelompok dalam populasi. Perbandingan ini memperlihatkan pengaruh komposisi terhadap persentase gabungan.",
      "summary": [
        "Populasi berkomposisi 60% tinggal jauh dan 40% dekat, sedangkan responden berkomposisi 20% jauh dan 80% dekat.",
        "Tingkat keluhan responden jauh 75%, dekat 25%, dan gabungan responden 35%.",
        "Gabungan berbobot 55% bersyarat pada keterwakilan dalam kelompok; bukan nilai populasi yang pasti.",
        "Sampel besar dapat mengurangi variasi acak, tetapi tidak otomatis menghilangkan bias sistematis."
      ]
    },
    "kasus-sampling": {
      "terms": [
        "Populasi sasaran",
        "Kerangka sampel",
        "Undercoverage",
        "Voluntary response bias",
        "Nonresponse bias",
        "Generalisasi"
      ],
      "example": "Sebagai penerapan, sebuah survei menilai kecukupan jam operasional laboratorium bagi seluruh mahasiswa Saintek. Tautannya hanya dibagikan melalui grup asisten laboratorium, dan 82% responden menyatakan jamnya memadai. Karena asisten mungkin memiliki akses serta jadwal berbeda, hasil ini belum otomatis mewakili seluruh mahasiswa. Undangan terbuka juga memungkinkan anggota dengan pendapat tertentu lebih terdorong berpartisipasi.",
      "summary": [
        "Evaluasi bergerak dari populasi sasaran, kerangka, pemilihan, dan respons menuju batas kesimpulan.",
        "Hasil 82% responden grup asisten belum otomatis berlaku bagi seluruh mahasiswa Saintek.",
        "Perbaikan mencakup jangkauan yang sesuai, pemilihan yang direncanakan, tindak lanjut respons, dan pertanyaan yang jelas."
      ]
    }
  },
  "correlation-causation": {
    "hubungan-variabel": {
      "terms": [
        "Variabel",
        "Pengamatan berpasangan",
        "Scatter plot",
        "Pola positif",
        "Pola negatif",
        "Kekuatan hubungan linear",
        "Outlier",
        "Hubungan nonlinear"
      ],
      "example": "Scatter plot adalah grafik untuk menampilkan pengamatan berpasangan. Variabel X diletakkan pada sumbu mendatar dan variabel Y pada sumbu tegak. Nama serta satuan sumbu menentukan cara membacanya. Jika X adalah jam latihan per minggu dan Y adalah skor tes, titik (4, 65) menunjukkan seorang peserta yang berlatih empat jam dan memperoleh skor 65. Pemilihan sumbu tidak dengan sendirinya menetapkan sebab-akibat.",
      "summary": [
        "Satu titik menyatakan pasangan X dan Y dari unit atau pasangan pengamatan yang sesuai.",
        "Positif dan negatif menunjukkan arah; kerapatan terhadap pola garis lurus menunjukkan kekuatan hubungan linear.",
        "Kemiringan berbeda dari kekuatan; tidak ada pola linear jelas belum meniadakan hubungan nonlinear.",
        "Outlier perlu diperiksa konteks serta ketepatan pengukurannya, bukan langsung dihapus."
      ]
    },
    "korelasi-kausalitas": {
      "terms": [
        "Korelasi",
        "Kausalitas",
        "Arah hubungan terbalik",
        "Confounding"
      ],
      "example": "Sebagai contoh, pengguna aplikasi kebugaran dapat terlihat lebih aktif daripada nonpengguna. Salah satu penjelasannya adalah aplikasi membantu meningkatkan aktivitas. Namun, arah hubungan terbalik juga mungkin: orang yang telah aktif lebih tertarik menggunakan aplikasi. Karena itu, kondisi sebelum penggunaan dan urutan waktunya perlu diketahui. Penjelasan lain adalah adanya faktor ketiga, seperti motivasi awal untuk hidup sehat, yang berhubungan dengan penggunaan aplikasi sekaligus aktivitas fisik. Lebih dari satu mekanisme dapat berlangsung bersamaan. Menemukan penjelasan alternatif tidak membuktikan bahwa aplikasi tidak bermanfaat; hal itu menunjukkan bahwa hubungan yang diamati belum cukup untuk menentukan besarnya pengaruh aplikasi.",
      "summary": [
        "Korelasi meringkas hubungan statistik; kausalitas menyatakan pengaruh sebab-akibat dan memerlukan dukungan bukti tambahan.",
        "Hubungan kuat masih dapat mempunyai arah terbalik atau penjelasan melalui faktor ketiga.",
        "Hubungan statistik tetap berguna untuk deskripsi, hipotesis, dan perkiraan; prediksi tidak otomatis menjadi bukti kausal."
      ]
    },
    "confounding": {
      "terms": [
        "Confounding",
        "Confounding variable",
        "Studi observasional",
        "Eksperimen",
        "Random sampling",
        "Random assignment"
      ],
      "example": "Pada studi aplikasi kebugaran, motivasi awal dapat meningkatkan kecenderungan seseorang menggunakan aplikasi sekaligus mendorong aktivitas fisik yang lebih tinggi. Apabila pengguna sejak awal lebih termotivasi, perbedaan aktivitas setelahnya dapat mencerminkan motivasi, pengaruh aplikasi, atau keduanya. Diagram menunjukkan kemungkinan motivasi awal memengaruhi dua variabel yang diamati. Panah menggambarkan hipotesis mekanisme, bukan pembuktian otomatis dari data.",
      "summary": [
        "Motivasi awal dapat memengaruhi penggunaan aplikasi sekaligus aktivitas fisik; diagram menyatakan kemungkinan mekanisme.",
        "Studi observasional mencatat kondisi yang ada; eksperimen menetapkan perlakuan.",
        "Random sampling memilih unit dari populasi; random assignment membagi peserta ke kondisi studi.",
        "Pengacakan pembagian mengurangi perbedaan awal sistematis, tetapi tidak menjamin kelompok persis sama atau sampel mewakili populasi."
      ]
    },
    "kasus-korelasi": {
      "terms": [
        "Perbedaan rata-rata",
        "Efek kausal",
        "Self-selection",
        "Studi observasional",
        "Random assignment"
      ],
      "example": "Sebuah studi hipotetis mengamati 120 mahasiswa. Pengguna aplikasi kebugaran berjalan rata-rata 8.000 langkah per hari, sedangkan nonpengguna berjalan rata-rata 6.000 langkah per hari. Penggunaan aplikasi dipilih oleh masing-masing peserta dan tidak ditetapkan melalui random assignment. Perbedaan rata-rata yang teramati adalah 8.000 − 6.000 = 2.000 langkah per hari. Angka ini menyatakan bahwa kelompok pengguna pada sampel memiliki rata-rata lebih tinggi. Angka tersebut bukan bukti bahwa aplikasi menyebabkan setiap pengguna menambah 2.000 langkah, dan belum menetapkan efek kausal rata-rata aplikasi pada populasi.",
      "summary": [
        "Dalam studi 120 mahasiswa, pengguna berjalan rata-rata 8.000 langkah dan nonpengguna 6.000 langkah per hari.",
        "Selisih teramati 2.000 langkah belum membuktikan kenaikan aktivitas yang disebabkan aplikasi.",
        "Self-selection dapat menghasilkan perbedaan motivasi dan aktivitas awal.",
        "Eksperimen dengan random assignment, pengukuran sebanding, serta pencatatan kepatuhan dan peserta keluar dapat memperkuat evaluasi kausal."
      ]
    }
  }
};

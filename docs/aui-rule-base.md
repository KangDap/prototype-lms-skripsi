# Rule-Based Adaptive User Interface

> Pembaruan 11 November 2026: dokumen ini menyimpan uraian engine dan validasi historis versi awal. Untuk alur penelitian saat ini, materi penuh, profil PILOT_A/PILOT_B, persistence stabil terpisah, log disk, CLT, dan sesi dua kondisi, gunakan [research-flow.md](research-flow.md). Pernyataan di bawah tentang materi yang hanya memiliki Pengantar, log RAM saja, atau kondisi per aplikasi berlaku untuk implementasi awal/pratinjau. Perubahan penelitian terbaru belum dijalankan atau dites.

## Tujuan dan batas interpretasi

AUI pada halaman materi memakai hasil FER yang sudah tersedia sebagai **sinyal afektif**, kemudian mengevaluasi pola temporal sebelum mengubah tampilan. Tujuan perancangan adalah mengurangi elemen antarmuka yang berpotensi menambah extraneous cognitive load. Efektivitasnya belum dibuktikan: pengukuran cognitive load dan evaluasi pengaruh adaptasi harus dilakukan dalam eksperimen terpisah.

FER bukan pengukur langsung cognitive load. Sadness tidak dilabel ulang sebagai Confusion; Anger tidak dianggap bukti cognitive overload. Label asli model tetap dipertahankan. Negative facial affect tidak otomatis menjelaskan penyebab maupun kondisi kognitif mahasiswa.

## Audit implementasi sebelumnya

- Next.js App Router, React, TypeScript, pnpm, komponen shadcn/Base UI.
- `src/features/fer/session.ts`: kamera opt-in, inferensi HTTP serial, pembatalan request, pembersihan stream ketika berhenti/error/halaman disembunyikan.
- `src/features/fer/client.ts`: validasi kontrak delapan label dan probabilitas.
- `services/fer`: FastAPI dan EmotiEffLib ONNX CPU, model `enet_b0_8_best_vgaf`; layanan ini tidak ditulis ulang atau diubah untuk AUI.
- Sidebar berada pada `StudentShell`; materi hanya mempunyai judul, durasi, dan bagian Pengantar. Belum ada glossary atau beberapa subbagian materi untuk digunakan sebagai bantuan.
- `docs/fer-integration.md` ditautkan README tetapi tidak ada pada checkout saat audit. Panduan pendamping tersebut dibuat berdasarkan kode yang tersedia, bukan dianggap sebagai dokumentasi lama yang telah dibaca.
- Working tree bersih saat audit awal; tidak dilakukan commit/push.

## Landasan ilmiah, keputusan desain, dan parameter

Ketiganya harus dibedakan dalam pelaporan penelitian:

| Kategori | Dasar dan batas pemakaian |
| --- | --- |
| Literatur: AUI berbasis emosi | [Medjden, Ahmed, & Lataifeh (2020)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0235908) membahas arsitektur pengenalan emosi dan adaptasi, termasuk pendekatan otomatis, manual, dan hybrid. Studi memakai sensor RGB-D serta postur, sehingga hasilnya tidak langsung memvalidasi FER webcam atau aturan prototipe ini. Judul lengkap: *Adaptive user interface design and analysis using emotion recognition through facial expressions and body posture from an RGB-D sensor*. |
| Literatur: model pengguna LMS dan CLT | [Suryani et al. (2024)](https://link.springer.com/article/10.1007/s10111-024-00772-8) mengembangkan model pengguna awal untuk adaptive LMS dengan pertimbangan cognitive load. Sumber ini dipakai untuk konteks desain dan perlunya evaluasi, bukan pembenaran menyamakan ekspresi wajah dengan cognitive load. |
| Literatur: dinamika afektif temporal | [D’Mello & Graesser (2011), DOI](https://doi.org/10.1080/02699931.2011.613668), dengan [abstrak di PubMed](https://pubmed.ncbi.nlm.nih.gov/21942577/), meneliti dinamika waktu kondisi cognitive-affective selama pembelajaran. Kajian ini memotivasi perhatian terhadap persistensi; tidak menetapkan window, mapping FER, atau cooldown pada implementasi ini. |
| Keputusan desain prototipe | Mapping valensi, Surprise ambiguous, window tidak tumpang tindih, UNKNOWN memutus persistence, tiga mode UI, persetujuan Assisted, dan konfigurasi eksperimen tetap selama sesi. |
| Parameter awal untuk pilot | Semua nilai numerik di bawah, termasuk confidence, dominansi, minimum sampel, jumlah window, cooldown, dan durasi recovery. Tidak diklaim berasal langsung dari ketiga paper. |

## Arsitektur dan berkas

```text
Webcam → existing FERSession/FastAPI → FERSample
  → EmotionAggregator (memakai affective-mapper)
  → AffectiveWindow
  → rule-engine
  → getAdaptiveUIConfig
  → AdaptiveMaterial + StudentShell
```

| Berkas pada `src/features/aui/` | Tanggung jawab |
| --- | --- |
| `types.ts`, `config.ts` | Kontrak, satu sumber parameter awal, validasi konfigurasi, dan konfigurasi presentasi. |
| `affective-mapper.ts` | Mengubah satu prediksi menjadi sinyal afektif; tidak membuat keputusan UI. |
| `emotion-aggregator.ts` | Statistik window berdasarkan waktu; tidak mengetahui mode UI. |
| `rule-engine.ts` | Fungsi transisi deterministik, persistence, cooldown, recovery, dan aksi manual. |
| `adaptive-session.ts` | Orkestrasi window dan aturan, lifecycle input, penolakan data terlambat, external store, event log. |
| `event-log.ts` | Buffer memori terbatas, format JSON, dan validasi struktur ekspor. |
| `adaptive-provider.tsx` | Adapter subscription FER, clock browser, timer, simulasi, ekspor, dan penerapan konfigurasi sidebar. |
| `adaptive-material.tsx`, `adaptive-controls.tsx` | Presentasi materi, kontrol pengguna, bantuan opsional. |
| `aui-debug-panel.tsx`, `simulation.ts` | Debug development dan generator prediksi sintetis. |
| `experiment.ts` | Membaca kondisi eksperimen di server dan menentukan ketersediaan debug. |

Perubahan kecil pada modul FER: tambahan timestamp pengambilan monotonik, pemaparan objek sesi kepada adapter, interval default 1 detik dari konfigurasi bersama, serta pembatasan debug. Tidak ada perubahan model, detector, request body, atau kontrak respons FastAPI.

## Affective mapping

| FER emotion/status | Sinyal |
| --- | --- |
| Happiness, Neutral | STABLE |
| Anger, Contempt, Disgust, Fear, Sadness | NEGATIVE_AFFECT |
| Surprise | AMBIGUOUS |
| no_face, invalid_prediction, error/tidak ada data, confidence rendah/tidak valid | UNKNOWN |

Hanya prediksi berstatus `ok`, berwajah, label dikenal, dan confidence pada rentang threshold sampai 1 yang valid. Respons real melewati validator kontrak FER terlebih dahulu. Surprise valid dalam penyebut rasio, tetapi bukan numerator negative/stable. Tidak ada substitusi no_face menjadi Neutral.

## Parameter terpusat

Sumber: `INITIAL_AGGREGATION_CONFIG` di `src/features/aui/config.ts`.

| Parameter | Nilai awal |
| --- | ---: |
| samplingIntervalMs | 1000 |
| windowDurationMs | 10000 |
| confidenceThreshold | 0.6 |
| minValidSamples | 8 |
| negativeRatioThreshold | 0.6 |
| stableRatioThreshold | 0.6 |
| requiredConsecutiveWindows | 2 |
| adaptationCooldownMs | 30000 |
| recoveryDurationMs | 1000 |

Konfigurasi dapat diberikan kepada konstruktor `AdaptiveSession` dan `EmotionAggregator` untuk pengujian/pilot. UI menggunakan nilai awal tersebut; perubahan parameter bukan kontrol mahasiswa. Konfigurasi sesi disalin dan dibekukan, lalu disertakan dalam ekspor. Parameter yang tidak valid ditolak. Jumlah threshold negative + stable harus > 1 agar dominansi tidak bertabrakan.

`NEXT_PUBLIC_FER_INTERVAL_MS` dapat mengganti jeda aktual capture real. Nilai awalnya berasal dari `samplingIntervalMs`; adapter menyertakan nilai interval yang dikonfigurasi ke parameter sesi/ekspor dan cadence simulasi. Nilai ini adalah **jeda setelah request selesai**, bukan janji satu hasil per detik. Latensi inferensi, transport, dan browser tetap menambah durasi. Jika hanya 7 prediksi valid masuk dalam 10 detik, hasil tetap UNKNOWN; tidak ada duplikasi sampel atau pelonggaran minimum otomatis. Catat konfigurasi lingkungan dan distribusi interval aktual pada pilot.

## Formula dan waktu

Untuk setiap window:

```text
validSamples = negativeSamples + stableSamples + ambiguousSamples
negativeRatio = negativeSamples / validSamples
stableRatio   = stableSamples / validSamples

validSamples < minValidSamples        → UNKNOWN
negativeRatio >= negativeThreshold    → NEGATIVE_AFFECT
stableRatio >= stableThreshold        → STABLE
lainnya                              → AMBIGUOUS
```

Jika penyebut nol, nilai rasio diagnostik adalah 0 dan state UNKNOWN. Confidence tepat 0.6 dan rasio tepat 0.6 diterima.

- Waktu keputusan dan capture memakai clock browser monotonik `performance.now()`. Timestamp dari server FER tidak menentukan keanggotaan window.
- Stream baru membuka window `[t0, t0 + 10000)`. Evaluasi dilakukan setelah batas akhir; hasil berikutnya masuk window berikutnya. Tidak ada sliding window dan tidak ada window yang tumpang tindih.
- Evaluator dipanggil tiap 250 ms dan sebelum ingest. Timer menentukan kapan evaluasi dilakukan, bukan jumlah prediksi yang dianggap masuk.
- Timestamp capture menentukan keanggotaan. Hasil yang datang setelah window capture-nya sudah ditutup tidak membuka kembali window itu dan tidak disisipkan ke window berikutnya. Event mencatat `usedForAggregation: false`. Tidak ada grace period dalam MVP.
- Jika timer tertunda sepanjang satu window atau lebih, window lama tidak boleh menghasilkan trigger baru. Gap diringkas sebagai window UNKNOWN terakhir yang sudah lewat; tidak dibuat rangkaian evaluasi lama untuk mengejar ketertinggalan.
- Stop/error, tab tersembunyi, restart, ganti sumber, dan unmount membuang window parsial dan hitungan persistence. Tidak ada evaluasi window baru ketika input berhenti.
- Token generation, identitas stream, urutan sampel, dan timestamp capture menolak respons sesi lama, duplikat, urutan terbalik, serta capture sebelum stream dimulai.

Contoh: window pertama 7/10 negative dan kedua 6/10 negative memicu R2 setelah window kedua selesai. Satu negative, satu UNKNOWN, kemudian satu negative tetap berada di DEFAULT.

## Tabel aturan

| ID | Kondisi | Keputusan |
| --- | --- | --- |
| R1 | Belum memenuhi aturan atau stabil pada DEFAULT | Pertahankan mode; mode awal DEFAULT. |
| R2 | DEFAULT, negative pada ≥2 window valid berurutan, cooldown selesai | FOCUS otomatis, reset persistence, mulai cooldown. |
| R3 | FOCUS, ≥2 window negative baru berurutan sejak transisi/reset, cooldown selesai | Tawarkan bantuan; tetap FOCUS, mulai cooldown penawaran. |
| R4 | Pengguna menerima penawaran yang masih aktif | ASSISTED; reset persistence, mulai cooldown. |
| R5 | FOCUS/ASSISTED, stable pada ≥2 window valid berurutan, cooldown selesai | RECOVERY internal selama 1 detik, kemudian DEFAULT. |
| R6 | UNKNOWN/AMBIGUOUS, window kedaluwarsa, atau input tidak tersedia | Tidak ada adaptasi baru; pertahankan mode aman, reset persistence dan batalkan recovery/penawaran yang belum selesai. |
| R7 | Kembali normal, enable/disable adaptasi, atau tolak bantuan | Jalankan pilihan manual, buang window parsial, reset persistence, mulai suppression/cooldown. Disable mengembalikan DEFAULT. |
| R8 | `now < cooldownUntil` | Blokir transisi/penawaran otomatis; tunggu evaluasi window baru yang memenuhi aturan setelah tenggat. |

UNKNOWN dan AMBIGUOUS **memutus**, bukan hanya menunda, rangkaian window. Window dominan berlawanan mereset penghitung sebelumnya. Window dengan gap atau evaluasi duplikat tidak menambah persistence. Angka persistence pada debug setelah transisi kembali nol karena rangkaian baru diperlukan.

## Transisi state

```mermaid
stateDiagram-v2
    [*] --> DEFAULT
    DEFAULT --> FOCUS: R2 / persistent negative + cooldown selesai
    FOCUS --> FOCUS: R3 / tawarkan bantuan
    FOCUS --> ASSISTED: R4 / pengguna menerima
    FOCUS --> FOCUS: R7 / pengguna menolak
    FOCUS --> RECOVERY: R5 / persistent stable + cooldown selesai
    ASSISTED --> RECOVERY: R5 / persistent stable + cooldown selesai
    RECOVERY --> DEFAULT: masa transisi selesai
    RECOVERY --> FOCUS: R6 / input invalid, jika mode sebelumnya FOCUS
    RECOVERY --> ASSISTED: R6 / input invalid, jika mode sebelumnya ASSISTED
    FOCUS --> DEFAULT: R7 / manual atau disable
    ASSISTED --> DEFAULT: R7 / manual atau disable
    RECOVERY --> DEFAULT: R7 / manual atau disable
```

RECOVERY adalah `phase` internal; `mode` masih FOCUS/ASSISTED selama masa transisi. Tidak ada layout materi baru untuk recovery. Diagram ini mendeskripsikan kode; tidak memerlukan layanan diagram eksternal.

## Cooldown, recovery, dan pilihan pengguna

Cooldown dimulai pada R2, penawaran R3, penerimaan R4, awal R5, dan setiap aksi manual R7. Tenggat adalah waktu aksi + 30000 ms, dan selesai ketika waktu sekarang ≥ tenggat. Aksi manual tidak menunggu cooldown; menerima bantuan selalu memerlukan penawaran aktif. Recovery dimulai setelah stable persistence dan cooldown, kemudian selesai setelah 1000 ms tanpa memerlukan prediksi baru; ini penyelesaian transisi yang telah disetujui aturan, bukan trigger dari window lama. Stop/UNKNOWN sebelum selesai membatalkannya.

Window baru selama cooldown tetap dihitung. Setelah tenggat, sistem hanya dapat mengambil keputusan pada **evaluasi window baru**, tidak ketika timer cooldown sekadar habis. Manual override juga membuang isi window parsial agar prediksi sebelum aksi tidak dipakai lagi. Re-enable mempunyai suppression 30 detik dan persistence baru.

Mode tidak dipersistenkan antarhalaman materi. Setiap materi memulai sesi baru pada DEFAULT. Navigasi, materi, dan fitur LMS tetap tersedia meskipun FER gagal.

## Perubahan tampilan

- DEFAULT: layout normal, sidebar mengikuti preferensi pengguna, durasi/informasi mata kuliah dan notifikasi terlihat.
- FOCUS: sidebar menjadi ikon, notifikasi dan metadata sekunder disembunyikan, batas lebar area belajar meningkat dari `max-w-3xl` ke `max-w-4xl`. Tombol navigasi tersedia, termasuk navigasi mobile dan link mata kuliah. Tema tetap dapat diubah.
- ASSISTED: perubahan Focus ditambah panel panduan setelah artikel. Outline mengarah ke Pengantar; link materi sebelumnya hanya muncul jika memang ada. Tidak dibuat glossary baru karena seed data belum menyediakannya. Tidak ada AI generation atau perubahan tingkat kesulitan.
- Recovery: indikator transisi, perubahan lebar memakai transisi CSS dan menghormati reduced motion. Artikel yang sama tetap mounted pada semua mode; tidak ada penggantian isi, navigasi route, atau perintah scroll ke awal. Preferensi sidebar sebelum adaptasi dipulihkan ketika kembali normal. Pengguna tetap dapat membuka sidebar saat Focus.

## Cara mencoba

```powershell
pnpm.cmd dev
```

1. Buka `/courses/matematika-diskrit/materials/logika` atau materi lain.
2. Untuk data asli, jalankan service FER sesuai [panduan FER](fer-integration.md), lalu pilih **Aktifkan FER** dan izinkan kamera.
3. Untuk pengujian tanpa kamera, buka **Debug AUI · development**, pilih **Simulasi**, lalu **Mulai simulasi**. Sumber ini tidak memerlukan FastAPI.
4. Biarkan Anger/confidence 0.82 berjalan. Setelah dua window valid selesai (sekitar 20 detik), sidebar dan metadata berubah ke Fokus.
5. Teruskan negative affect. Penawaran bantuan paling awal sekitar detik ke-50 dari awal stream karena cooldown dimulai saat R2. Pilih terima atau tolak.
6. Ganti ke Neutral. Setelah dua window dominan stable dan cooldown berakhir, lihat recovery ke Normal. Pergantian emosi di tengah window dapat menunda dominansi.
7. Coba Surprise, confidence 0.4, no_face, invalid_prediction, error, stop/restart, disable, dan kembali normal. UNKNOWN tidak mengubah tampilan berdasarkan emosi negatif.
8. Buka **Catatan sesi dan ekspor**, akhiri dan ekspor sebelum menutup halaman.

Nilai debug pada window berjalan adalah preview statistik, bukan state final yang sudah dievaluasi. State final ditampilkan terpisah. Reset development mengakhiri log lama dan membuat sesi bersih; log lama tetap terpisah di ekspor.

## Kondisi eksperimen

Atur `.env.local` dari `.env.example` sebelum memulai sesi:

```dotenv
AUI_EXPERIMENT_CONDITION=ADAPTIVE
AUI_RESEARCH_MODE=true
NEXT_PUBLIC_FER_INTERVAL_MS=1000
```

Ganti kondisi menjadi `NON_ADAPTIVE` untuk kontrol. Restart Next.js setelah mengubah environment. Nilai selain dua kondisi tersebut ditolak; tidak ada dropdown kondisi di UI. Server meneruskan kondisi tetap ke sesi materi, sehingga perubahan environment/props tidak mengubah konstruktor sesi yang sedang berjalan. Halaman materi dirender dinamis agar server membaca konfigurasi runtime. Refresh atau berpindah materi berarti sesi baru; penguncian bukan sistem randomisasi atau pengelolaan partisipan.

ADAPTIVE: FER tetap opt-in; agregasi dan engine dapat mengubah UI. NON_ADAPTIVE: materi yang sama, FER opsional dengan persetujuan, agregasi/logging boleh berjalan, mode selalu DEFAULT. Tidak ada debug/simulasi pada NON_ADAPTIVE. Debug juga tidak ditampilkan pada production maupun ketika `AUI_RESEARCH_MODE=true`, termasuk `pnpm dev`. Gunakan mode penelitian saat pengambilan data; jangan memakai log development yang mempunyai pengulangan lifecycle React Strict Mode sebagai sesi partisipan.

## Logging, retensi, dan ekspor

Event utama: SESSION_STARTED/ENDED, FER_PREDICTION, AFFECTIVE_WINDOW_EVALUATED, ADAPTATION_TRIGGERED, UI_MODE_CHANGED, ASSISTANCE_OFFERED/ACCEPTED/DISMISSED, MANUAL_OVERRIDE. Event tambahan FER_STATUS_CHANGED dan RECOVERY_STARTED menjelaskan perubahan lifecycle.

Setiap event memuat sequence, timestamp UTC, elapsedMs, sessionId, condition, source, mode dan affective state final terakhir. Event terkait menambahkan emotion/confidence, status prediksi, ID stream/urutan capture, hasil pemakaian sampel, window/count/ratio, previousMode, ruleId dan reason. Raw prediction dan state agregasi tidak disamakan dengan mode UI. Hanya atribut numerik dan label dicatat; tidak ada Blob kamera, image, video, atau probabilitas lengkap pada log.

Ekspor JSON membungkus `sessions[]` dan `validation[]`. Tiap sesi mencantumkan konteks materi, sumber, kondisi, konfigurasi, startedAt/endedAt, `monotonicOriginMs`, jumlah event tertahan/hilang, dan `complete`. Untuk analisis waktu window/capture: kurangi koordinat monotonik dengan `monotonicOriginMs` agar mendapatkan offset relatif terhadap awal sesi. Timestamp event dibuat dari anchor waktu dinding awal + selisih clock monotonik, sehingga perubahan jam dinding selama sesi tidak mengubah urutan durasi.

Retensi dan batas keandalan:

- Buffer hanya RAM pada halaman materi, bukan localStorage, database, atau backend penelitian. Reload, navigasi, browser crash, atau penutupan tab menghilangkan buffer. Event akhir yang terjadi pada unmount tidak otomatis disimpan ke disk.
- Maksimum 10000 event per sesi; satu slot dicadangkan untuk SESSION_ENDED. Saat penuh, event baru tidak menimpa event lama; penghitung kehilangan naik dan UI menampilkan peringatan. Log tersebut tidak lengkap untuk penelitian. Ekspor berkala/sebelum batas tercapai dan tetapkan durasi sesi saat pilot.
- Pergantian REAL/SIMULATION dan reset development menghasilkan sessionId baru. Ekspor boleh memuat beberapa sesi, tetapi tidak pernah mencampurkan event real dan mock di satu sessionId. Filter `source === REAL` untuk data partisipan.
- **Ekspor log sementara** menandai sesi aktif belum final. **Akhiri sesi dan ekspor log** menghentikan FER/input, menambahkan SESSION_ENDED, mengunci sesi, dan membuat berkas JSON. Muat ulang untuk memulai sesi baru setelahnya.
- Validasi lokal memeriksa identitas sumber/kondisi, urutan event, timestamp, batas sesi, jumlah event, dan kehilangan kapasitas. Ini validasi struktur, bukan pembuktian kelengkapan data setelah crash atau kebenaran FER.
- Pastikan unduhan selesai, buka JSON, periksa semua `validation[].issues`, `complete`, serta `droppedEvents === 0`. Validasi dan cadangkan file di prosedur penelitian sebelum analisis; file download bukan penyimpanan otomatis yang andal. Kebijakan retensi file ekspor di luar browser ditentukan oleh protokol penelitian.

## Pengujian dan hasil

```powershell
pnpm.cmd test:aui
pnpm.cmd test
pnpm.cmd exec tsc --noEmit
pnpm.cmd lint
pnpm.cmd build
```

Pengujian memakai `node:test` dan loader TypeScript in-memory mengikuti pengujian FER yang sudah ada; tidak memerlukan dependency test baru, webcam, atau model. Typecheck terpisah tetap diperlukan karena loader hanya transpile.

Hasil validasi implementasi (5 November 2026): 31 unit test AUI lulus dan 8 regression test FER lulus. TypeScript, ESLint, dan production build lulus. Chromium headless lulus 6 pemeriksaan alur adaptive dengan clock virtual: perubahan sidebar Focus, terima/tolak bantuan dengan cooldown, recovery, manual override/disable, responsivitas mobile, dan ekspor final dengan sumber terpisah. Dua pemeriksaan tambahan pada server produksi NON_ADAPTIVE memastikan tampilan DEFAULT tanpa debug serta ekspor final valid. Tidak ada uncaught exception pada browser. Webcam fisik dan inferensi model nyata tidak dijalankan ulang dalam pekerjaan ini.

Smoke test browser tambahan ada pada `scripts/test-aui-browser.cjs` dan memakai CDP bawaan Chromium, tanpa memasang dependency baru. Jalankan Chromium khusus pengujian dengan remote debugging pada port 9335 dan profil sementara, lalu jalankan `node scripts/test-aui-browser.cjs` ketika server development tersedia pada port 3001. Override endpoint lewat environment `AUI_CDP_URL` dan `AUI_TEST_URL`. Untuk server production NON_ADAPTIVE, gunakan `node scripts/test-aui-browser.cjs --production --non-adaptive`. Chromium harus mendukung CDP dan Node harus menyediakan global WebSocket (divalidasi dengan Node 22). Script memakai prediksi sintetis melalui kontrol UI dan clock virtual browser; tidak meminta kamera. Hasil/screenshot berada pada `.next/aui-browser-check/`, bukan data penelitian.

| Cakupan | Pengujian |
| --- | --- |
| Mapping dan agregasi | Delapan label, Neutral/Happiness, negative tepat 60%, Surprise dalam penyebut, confidence di bawah/tepat batas, no_face/invalid/error, minimum sampel, batas waktu capture, window non-overlap. |
| Aturan | Satu/dua window, persistence putus pada UNKNOWN/AMBIGUOUS/gap/duplikat, cooldown, tawaran bantuan, terima/tolak, recovery Focus/Assisted, pembatalan recovery, manual override, disable/re-enable. |
| Lifecycle dan eksperimen | Stop/restart, token sesi lama, sumber terpisah, response terlambat, timer tertunda, mode aman saat gagal, NON_ADAPTIVE, kondisi server, visibilitas debug, sesi final tidak menerima data. |
| Logging dan presentasi | Finalisasi/validasi ekspor, batas buffer dan event hilang, flags mode UI. |

## Keterbatasan dan pilot testing

Belum ada bukti penurunan cognitive load, diagnosis kognitif, kalibrasi confidence, validasi lintas partisipan, autentikasi, database penelitian, atau dashboard peneliti. Bantuan hanya memanfaatkan Pengantar dan urutan materi yang tersedia. Mode eksperimen dikonfigurasi per aplikasi, bukan randomisasi per akun. Kontrol manual menjadi bagian interaksi yang perlu dianalisis.

Evaluasi pada pilot: akurasi/kalibrasi FER, kondisi pencahayaan dan pose, distribusi latensi/interval, proporsi window UNKNOWN, kecocokan window 10 detik dan minimum 8 sampel, threshold confidence/ratio, kebutuhan 2 window, cooldown 30 detik, recovery 1 detik, keterlihatan penawaran bantuan, pergerakan layout/scroll pada perangkat partisipan, serta kelengkapan ekspor. Jika banyak window tidak valid akibat inferensi lambat, revisi konfigurasi secara eksplisit setelah pilot, bukan menafsirkan data kosong sebagai stable/negative.

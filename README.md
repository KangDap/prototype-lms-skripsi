# Ruang Belajar

Initial student-facing LMS dashboard for an undergraduate thesis prototype exploring facial emotion recognition and adaptive interfaces.

Materi terbaru: **statistics-id-draft-4** — [modul lengkap](docs/learning-modules-draft-4.md) dan [laporan revisi materi, penempatan SVG, serta audit cakupan soal](docs/material-revision-draft-4.md). Gunakan sesi baru untuk snapshot materi ini. Revisi konten belum dijalankan atau diuji.

Revisi aktif 14 November 2026: [laporan implementasi, pembersihan dan pemeriksaan manual](docs/revision-2026-11-14.md). Sesi baru memakai FER-triggered user-approved AUI, PILOT_C minimum 4 sampel valid/window, tes 8 soal A–E, CLT tiga langkah, dan panduan awal. Perubahan ini belum dijalankan atau diuji; snapshot sesi lama dipertahankan.

## Run locally

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The root route redirects to `/dashboard`.

For a local production build:

```sh
pnpm build
pnpm start
```

On Windows PowerShell, use `pnpm.cmd` if the execution policy blocks `pnpm.ps1`.

## Current scope

- Responsive Indonesian student dashboard with shadcn/ui (Base UI, Nova).
- Dashboard learning summary and an assignment timeline grouped by WIB deadline, with search, deadline filters, sorting, and links to assignment pages.
- Seeded courses with dedicated course and material pages. Course pages group materials and related tasks into collapsible class meetings, showing class dates, durations, deadlines, and completion status together.
- Search by course name, code, or lecturer, with empty states.
- Course bookmarks, expandable course navigation, a sidebar profile dropdown, and mobile navigation.
- Breadcrumbs that follow dashboard, course, and material routes.
- A simple profile page displaying the current student's name, email, and program.
- Shared assignment timelines across dashboard, assignments, and calendar, with status, course, and deadline-period filters, search, and sorting. Filters combine; deadline periods use WIB calendar days, including today (seven days means today plus the next six days, excluding deadlines already passed).
- Individual assignment instruction pages, linked from each course.
- A deadline calendar with date selection, month navigation, and shared assignment data. Dates and times use WIB (Asia/Jakarta).

Materi placeholder telah diganti Sampling Bias dan Correlation vs Causation. Peserta memakai dashboard → course → halaman materi. Pada setiap materi sesi baru, alurnya pretest → belajar → posttest → CLT. Guidance bawah dihapus; setelah posttest dan CLT selesai peserta otomatis kembali ke course. Progres course mengikuti sesi tersimpan; tidak ada riwayat atau tugas contoh.

Halaman `/` sekarang berisi form masuk kode peserta dan kode PC. Backend lokal mengambil alokasi dari `config/research-allocation.json`; peserta tidak memilih urutan, kondisi AUI, profil, atau jenis sesi. Peneliti dapat mengedit/import/export daftar lewat pengaturan berpassword, lalu menyertakan satu berkas konfigurasi yang sama dalam paket semua PC. Contoh bawaan: TEST001–TEST004 dan LAB01–LAB04, khusus jenis TEST.

**Panduan konfigurasi bersama dan FER mandiri: [docs/lab-setup.md](docs/lab-setup.md).** Tersedia `pnpm.cmd lab:setup`, `pnpm.cmd lab`, dan `pnpm.cmd lab:dev`. Script hanya ditambahkan; setup/instalasi/build/startup/tes belum dijalankan pada revisi 12 November 2026.

Research material pages automatically request webcam FER during the learning phase using the real local EmotiEffLib ONNX model. Native browser camera permission is still required. Camera access, sampling, cancellation, and predictions are isolated in `src/features/fer`; the Python runtime is in `services/fer`. The dashboard does not request FER inference; the shared session provider maintains local autosave across LMS routes.

Indikator wajah tersedia di header semua halaman. FER diminta aktif otomatis hanya selama fase belajar materi; izin kamera bawaan browser tetap diperlukan. Halaman lain menunjukkan kamera nonaktif. Pengaturan sesi dan ekspor ada di dropdown profil bawah → **Pengaturan penelitian** (`/profile/settings`), dilindungi password `RESEARCHER_KEY`, juga saat development. Setelah sesi dibuat, pengaturan dikunci dan peserta diarahkan ke dashboard. `/research` dan `/study` hanya pintasan kompatibilitas.

**Panduan FER (PowerShell, audit, arsitektur, pengujian, dan langkah AUI berikutnya): [docs/fer-integration.md](docs/fer-integration.md).**

Rule-Based AUI menyediakan Focus, tawaran Assisted, recovery, dan kontrol manual. Sesi penelitian mengikat dua blok ADAPTIVE/NON_ADAPTIVE, pretest–posttest, serta struktur CLT 15 butir. Ada autosave IndexedDB, penyimpanan disk lokal, pemulihan sesi, ringkasan FER, dan ekspor JSON/CSV. FER tetap merupakan sinyal adaptasi, bukan pengukuran cognitive load. Akun mahasiswa dan integrasi Google Sheets tidak ditambahkan.

**Panduan mencoba alur, konfigurasi CLT, ekspor, serta penggabungan PC: [docs/research-flow.md](docs/research-flow.md). Perubahan penelitian 12 November 2026 belum dijalankan atau dites sesuai permintaan pengguna.**

## Structure

- `src/app/(student)`: shared student layout, dashboard, course, material, assignment, calendar, and saved routes.
- `src/features/lms`: LMS types, seed data, and dashboard components.
- `src/features/fer`: FER contract, HTTP client, camera session controller, prediction provider, and optional debug UI.
- `src/features/aui`: affective mapping, temporal aggregation, rule engine, lifecycle/logging, UI configuration, controls, and development simulation.
- `src/features/research`: materi/diagram, asesmen, definisi CLT, alur dua blok, antrean lokal, penyimpanan, operator, dan ekspor.
- `src/app/api/research`: server Node Route Handler untuk sesi dan data penelitian.
- `services/fer`: standalone local Python API and inference pipeline, with no imports from the experiment project.
- `src/components/ui`: reusable shadcn components.
- `src/app/globals.css`: shared theme tokens and dashboard layout styles.

Seed data stays separate from presentation. FER, aggregation, adaptation, and logging retain their own module boundaries; learning content is identical across UI modes and experiment conditions.

Materi utama ada di `src/features/research/content.ts`; seed LMS merujuk modul tersebut. Sesi menyimpan snapshot materi, soal, instrumen, serta konfigurasi AUI agar pengeditan berikutnya tidak mengubah sesi lama. Redaksi CLT sudah diisi sesuai draf peneliti: ICL1–5, ECL1–5, GCL1/GCL3/GCL5/GCL6/GCL7. Teks dan soal/protokol masih draf untuk ditinjau. TEST/PILOT dapat memakai teks lengkap; MAIN memerlukan persetujuan. Sesi TEST menyediakan simulasi jawaban CLT dengan penanda terpisah dalam ekspor. Skor hanya tersedia untuk peneliti.

## Checks

Ruang peneliti kini mempunyai dashboard hasil dari data tersimpan dan tab pengaturan/responden, dengan layout tanpa sidebar mahasiswa. Lihat [panduan dashboard peneliti](docs/researcher-dashboard.md). Akses hasil memerlukan password peneliti; ringkasan hanya mencakup data pada PC/instance LMS yang dibuka. Perubahan ini belum dijalankan atau dites oleh asisten.

Perombakan DEFAULT/FOCUS/ASSISTED (`research-2026-11-12-v7`) memakai pembaca per bagian, sidebar offcanvas, dan bantuan kontekstual yang sama pada kedua kondisi. Lihat [rancangan, daftar file, log, dan panduan pemeriksaan](docs/aui-reading-redesign.md). Gunakan sesi TEST baru agar snapshot menyertakan bantuan `statistics-id-draft-2`. Implementasi ini belum dijalankan atau dites oleh asisten.

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm build
node scripts/test-fer.cjs
pnpm test:aui
```

The existing `next/font/google` setup downloads Geist at build time and bundles it for serving locally. Preparing a build therefore requires font access; serving that build does not require browser-side Google font requests.

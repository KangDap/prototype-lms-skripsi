# Ruang Belajar

Initial student-facing LMS dashboard for an undergraduate thesis prototype exploring facial emotion recognition and adaptive interfaces.

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

Course progress, identity, recent activity, and assignment status are demonstration data. Assignment pages show instructions and deadlines; they do not collect answers or files. Bookmarks and sidebar state persist between student routes in browser memory and reset on refresh. Material pages display introductory content; they do not create learning sessions or change completion state.

Material pages now offer opt-in webcam FER using the real local EmotiEffLib ONNX model. The debug panel is hidden by default. Camera access, sampling, cancellation, and predictions are isolated in `src/features/fer`; the Python runtime is in `services/fer`. The dashboard makes no requests to an inference or logging service.

**Panduan FER (PowerShell, audit, arsitektur, pengujian, dan langkah AUI berikutnya): [docs/fer-integration.md](docs/fer-integration.md).**

Adaptive UI, emotion aggregation, research logging, authentication, and Google Sheets integration remain deferred.

## Structure

- `src/app/(student)`: shared student layout, dashboard, course, material, assignment, calendar, and saved routes.
- `src/features/lms`: LMS types, seed data, and dashboard components.
- `src/features/fer`: FER contract, HTTP client, camera session controller, prediction provider, and optional debug UI.
- `services/fer`: standalone local Python API and inference pipeline, with no imports from the experiment project.
- `src/components/ui`: reusable shadcn components.
- `src/app/globals.css`: shared theme tokens and dashboard layout styles.

Seed data stays separate from presentation. Future session, FER, aggregation, adaptation, and research modules should retain their own boundaries.

Each course's `meetings` in `src/features/lms/seed-data.ts` defines its sample class schedule and ordered `activities`. Activity references use a `materialId` or `assignmentId`, so content and assignment deadlines stay in their original records. Class dates are separate from submission deadlines. The seeded meeting dates and groupings can be replaced when the study content is ready; a meeting may include multiple materials, tasks, or no task.

## Checks

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm build
node scripts/test-fer.cjs
```

The existing `next/font/google` setup downloads Geist at build time and bundles it for serving locally. Preparing a build therefore requires font access; serving that build does not require browser-side Google font requests.

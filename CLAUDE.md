# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page app for generating pressure-gauge **calibration certificates** for Brilliant Industries. A lab technician fills in customer/instrument/range details, the app auto-selects the appropriate reference "master" instrument and generates a calibration readings table formatted to match the company's printed certificate layout.

## Commands

```bash
npm run dev       # Vite dev server on :5173 (frontend only)
npm run server    # Express API on :3001 (backend only)
npm start         # both together, via `concurrently`
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build
```

There is no test suite and no lint config in this repo — don't assume `npm test`/`npm run lint` exist.

Run `npm start` for full local development; the Vite dev server proxies `/api/*` to `localhost:3001` (see [vite.config.js](vite.config.js)), so the frontend always talks to `/api/...` (relative paths via axios), never a hardcoded host.

## Architecture

**Two-process app**: Vite/React frontend (`src/`) + Express/better-sqlite3 backend (`server/`), no shared code between them — API contracts are informal (matched by hand, no schema/types).̦

### Backend ([server/index.js](server/index.js), [server/database.js](server/database.js))

- `database.js` opens `server/companies.db` (SQLite, WAL mode) and **auto-seeds** three tables with demo data if empty: `companies`, `uuc_instruments`, `master_equipment`. This seeding runs on every server start and is idempotent (checked via row count), so editing the seed data only affects fresh/empty databases.
- Plain `express` routes in `index.js`, no router modules — all endpoints live in one file:
  - `GET /api/companies/:id`, `GET /api/instruments/:id`, `GET /api/masters`, `GET /api/masters/:id` — simple lookups.
  - `GET /api/match-master?rangeMin&rangeMax` — the core matching endpoint. Converts the UUC's kg/cm² range to bar (factor `0.9806`), filters `master_equipment` rows whose range covers it, then scores candidates by `gap * 0.8 + expanded_uncertainty * 0.2` (tightest-fitting, lowest-uncertainty master wins) and returns the best one.
- All units in `master_equipment.range_min/max` are stored in **bar**; UUC ranges entered in the UI are in **kg/cm²**. The `0.9806` conversion constant appears independently in three places — [server/index.js](server/index.js), [src/utils/calculations.js](src/utils/calculations.js), and [src/utils/rangeMatcher.js](src/utils/rangeMatcher.js) — keep them in sync if it ever changes.

### Frontend ([src/App.jsx](src/App.jsx))

`App.jsx` owns all form state (`form` object) and passes `form`/`setForm` down to presentational section components under `src/components/` (`CertificateHeader`, `CustomerSection`, `UUCDetails`, `StaticFields`, `StandardEquipment`, `CalibrationTable`, `CertificateFooter`) — there's no state management library, just prop drilling from one top-level component. Each section is a self-contained MUI `Paper` block styled to resemble the printed certificate.

Two independent "fetch by ID" flows call the backend directly from within their section component (`CustomerSection` fetches by Customer ID, `UUCDetails` fetches by Instrument ID), each managing its own loading/error state locally rather than through `App.jsx`.

`UUCDetails`'s "Search for Appropriate Master" button triggers `handleSearchMaster` in `App.jsx`, which calls `/api/match-master` and stores the result in `equipment` state. `equipment` plus the UUC range/accuracy then feed `generateCalibrationData()` ([src/utils/calculations.js](src/utils/calculations.js)) to produce the calibration table rows.

**Calibration data is simulated, not measured**: `generateCalibrationData` synthesizes M1/M2 readings around each nominal pressure point using a seeded PRNG (fixed seed `42`, so output is deterministic per input) plus a hysteresis offset derived from the selected accuracy class (`ACCURACY_FRACTIONS`). This is filling in a printable form with plausible calibration figures, not processing real instrument data — keep that in mind before "fixing" the numbers to be more realistic or non-deterministic.

### Dead code

[src/utils/rangeMatcher.js](src/utils/rangeMatcher.js) and [src/utils/equipmentData.js](src/utils/equipmentData.js) are unused leftovers from before master-equipment matching moved server-side into `/api/match-master`. Nothing imports them.

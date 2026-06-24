# Masterpiece Mileage — Architecture Audit & Modular Target

> Lens: **Architecture** · Source of truth: `src/App.jsx` (3,195 lines) · Audited against the live code, every claim line-referenced.

---

## 1. Executive Summary

The entire application is **one React component**. `export default function App()` runs from `App.jsx:487` to `App.jsx:3195` and owns **62 `useState` hooks**, every data-access call, all business logic (geocoding, routing, pay-period math, report aggregation, CSV/email export), and every screen of UI as inline JSX with ~235 inline style objects and zero CSS classes.

There is no router, no state container, no auth library, no data-access abstraction beyond a 6-line `api()` helper, no TypeScript, and no tests. The app is deliberately rendered **without `<React.StrictMode>`** (`main.jsx:6-11`) because several handlers/effects `POST` to Supabase and are not idempotent — StrictMode's double-invoke would create duplicate writes.

This document (a) maps the monolith exhaustively and (b) proposes a **branches / engines / modules** target architecture with a **strangler-fig migration order** where the app keeps building and shipping after every single step.

---

## 2. Current Architecture (As-Built)

### 2.1 Entry & build

- `index.html` → `src/main.jsx` → `src/App.jsx`.
- `main.jsx:11` renders `<App />` **without** StrictMode; the comment at `main.jsx:6-10` documents that effects are not yet idempotent.
- Stack: React 18 + Vite. No router, no `@supabase/supabase-js`, no CSS framework.

### 2.2 Module-level constants & helpers (top of `App.jsx`)

| Symbol | Lines | Responsibility |
|---|---|---|
| `SB`, `KEY`, `H` | 3-10 | **Hardcoded** Supabase URL, anon JWT, and default REST headers (`Prefer: return=representation`). |
| `api(path, opts)` | 12-17 | The **entire data layer**. Raw `fetch` to `${SB}/rest/v1/${path}`, throws on non-OK, JSON-parses. |
| `geocode(address)` | 19-75 | **Geocoding engine.** Sequential fallback Photon → Nominatim → ArcGIS, hardcoded `setTimeout` throttles, returns `{lat,lng}` or `null`. Heavy `console.log`. |
| `getDrivingMiles(from, to)` | 77-116 | **Routing engine.** Reads `route_distances` cache by address pair → geocodes both ends → OSRM call → meters→miles → upserts cache. Returns `null` on any failure. |
| `getPayPeriod(date, anchor, freq, time, tz, offset)` | 118-139 | **Pay-period engine.** Pure UTC-minute math. Period length: weekly 7 / monthly 30 / else 14 days. |
| `fmtDate`, `fmtDateFull` | 141-154 | Date formatting. |
| `today()` | 156-158 | `America/Denver` `en-CA` ISO date. |
| `thisYear()` | 160-162 | Current year. |
| `ROLES`, `RLBL` | 164-170 | Role rank map + display labels. |
| `P` (palette) | 172-191 | **Theme tokens** — 20 hardcoded colors. |
| `Ft` (fonts) | 193-197 | Font stacks. |
| `iS` | 199-210 | Shared input style object. |
| `css` (string) | 1260 | Google-Fonts `@import` + keyframes + `.no-print`, injected via `<style>`. |

### 2.3 In-file presentational components

Only seven, all stateless except where noted:

- `Logo()` — `212`
- `Modal({open,onClose,title,children})` — `276`
- `Fl({label,children})` (field label) — `352`
- `Btn({...})` — `374`
- `Toast({m,s})` — `402`
- `Nav({tab,set,admin})` — `430`

Everything else is inlined inside `App`.

### 2.4 The 62 `useState` hooks, grouped by concern

Declared `App.jsx:488-554`. Grouped:

**Auth / session (7):** `user`(488), `mode`(489), `aName`(490), `aPin`(491), `aEmail`(492), `aErr`(493), plus derived `isA`/`isS`(561-562).

**Reference data / loaded entities (6):** `projs`(494), `trips`(495), `settings`(496), `users`(502), `receipts`(544), `loaded`(523).

**UI / navigation (3):** `tab`(503), `adPg`(524, admin sub-page), `toast`(522).

**Trip entry (5):** `fromId`(504), `toId`(505), `tripNote`(506), `tripDate`(507), `calculating`(508).

**Trip "log for / manual / edit" (10):** `logForUser`(543), `manualMod`(533), `manualMiles`(534), `editMod`(535), `editT`(536), `edFr`(537), `edTo`(538), `edDt`(539), `edNt`(540), `delTripMod`(530).

**Projects (3):** `projMod`(509), `nPN`(510), `nPA`(511).

**Reports (7):** `reportUser`(512), `reportPeriod`(513), `reportMonth`(514), `payPeriodOffset`(515), `showRejected`(516), `myShowRejected`(517), `emailMod`/`emailTo`(531-532).

**Settings (4):** `settingsRate`(518), `settingsAnchor`(519), `settingsFreq`(520), `settingsTime`(521).

**Admin / users (6):** `editUser`(525), `euN`(526), `euE`(527), `euP`(528), `delUserMod`(529), `shareMod`/`sharePhones`(541-542).

**Receipts (11):** `rcMod`(545), `rcAmt`(546), `rcDate`(547), `rcNote`(548), `rcFile`(549), `rcPreview`(550), `rcUp`(551), `rcForUser`(552), `editRc`(553), `delRcMod`(554).

> **Truly shared state** (read by many screens, must lift into a store/context): `user`, `projs`, `trips`, `receipts`, `users`, `settings`, `loaded`, `tab`, `toast`/`show`. The remaining ~50 are **form/modal-local** and should live inside their respective feature modules, not at the app root.

### 2.5 Handlers / business logic inside `App` (all closures over state)

| Handler | Lines | Concern |
|---|---|---|
| `show` | 556 | Toast helper (useCallback). |
| `load` | 564-588 | Parallel fetch of projects/trips/settings/users/receipts. |
| 15s polling effect | 594-598 | `setInterval(load, 15000)`. |
| `login` / `signup` | 600-652 | PIN auth against `yard_users`. |
| `logTrip` | 654-703 | Validate → `getDrivingMiles` → POST trip → fall back to manual modal. |
| `saveManualTrip` | 705-745 | Manual-miles trip POST. |
| `compressImg` / `pickReceiptFile` / `saveReceipt` / `openEditReceipt` / `deleteReceipt` | 747-846 | Receipts (canvas compress + Storage upload). |
| `saveProj` | 848-866 | Project insert. |
| `saveSettings` | 868-885 | Settings PATCH. |
| `approveTrip` / `rejectTrip` / `deleteTrip` / `openEdit` / `saveEdit` | 887-976 | Trip status + edit. |
| `shareApp` | 978-996 | SMS deep link. |
| `togUser` / `chRole` / `saveEU` / `delUser` | 998-1055 | Employee admin. |
| Inline report aggregation | 1057-1153 | Filtering + reducers (see §2.7). |
| `exportCSV` / `printReport` / `emailReport` | 1156-1258 | Output engines. |

### 2.6 Screens (driven by `tab` string state)

`{tab === '...'}` blocks inside the render:

- **Login / Signup** (pre-auth gate) — `1262-1434`
- **Loading** — `1436-1452`
- **Log Trip** — `1519` (stats cards, from/to selects, today's trips)
- **Receipts** — `1824`
- **My Trips** — `1891` (active/rejected toggle, month separators)
- **Projects** — `2091`
- **Reports** — `2155` (admin-gated; filters, totals, per-user totals, approve/reject)
- **Admin** — `2515`, with sub-pages `adPg` = `hub`(2517) / `employees`(2573) / `settings`(2728)

**10 Modals** at `2854-3182`: project, manual, edit-trip, edit-user, delete-trip, delete-user, email, share, receipt, delete-receipt.

### 2.7 Report aggregation (inline in render body)

`App.jsx:1057-1153` computes, on every render: `myTrips`, `myActiveTrips`, `myRejectedTrips`, current & offset pay periods (`pp`, `selPP`, `ppList`), `todayMiles`/`ppMiles`/`ytdMiles`, `allFilteredTrips` (user+period match + sort), `activeTrips`/`rejectedTrips`, `reportMiles`/`reportReimb`, `userTotals`, `reportReceipts`, `userReceiptTotals`. **Live `console.log` debug** runs every render at `1082-1088` and `1115-1117`.

### 2.8 Data flow to Supabase

```
UI handler ─▶ api(path, opts) ─▶ fetch ${SB}/rest/v1/<table>
                                      │
   tables: projects · trips · mileage_settings · yard_users · receipts · route_distances
   storage: receipts bucket (raw fetch, App.jsx:789-795)
                                      │
            load() Promise.all (566-572) ◀── setInterval 15s (594-598)
```

---

## 3. Key Risks in the Current Structure

1. **Secrets in client bundle** — `KEY` hardcoded (`App.jsx:4`); whole `yard_users` table (incl. plaintext PINs) is anon-readable. Auth is name+PIN compared client-side (`login`, 600-620). *(Owned by the security lens; flagged here as an architectural constraint.)*
2. **`saveEdit` recalc bug** — passes `geocode()` result objects into `getDrivingMiles(fG,tG)` which expects **address strings** (`App.jsx:943-947`); breaks/double-geocodes the edit path. `logTrip` (668) passes strings correctly.
3. **Non-idempotent effects** block StrictMode (`main.jsx:6-11`) and hide real double-render bugs.
4. **Render-time side effects & cost** — debug `console.log` (1082-1117) and ~100 lines of reducers run every render; 15s full-table polling.
5. **No seam for white-label theming** — colors (`P`) and fonts (`Ft`) are module constants referenced ~235 times inline; logos are inlined SVG (`Logo`, 212).
6. **No test surface** — every pure function (pay-period, miles math, CSV) is trapped in closures and untestable.

---

## 4. Target Modular Architecture ("Branches, Engines, Modules")

**Vocabulary for Stephen:**
- **Engine** = a pure, stateless calculator (no React, no network). Easy to test, easy to swap.
- **Branch / Module** = one feature area of the app (Trips, Receipts, Reports…), self-contained.
- **Lib** = the plumbing that talks to Supabase.
- **Theme** = the paint (colors, fonts, logos) so each customer can look different.

### 4.1 Proposed `src/` tree

```
src/
  main.jsx                 # mounts <App/>, re-enables StrictMode once safe
  App.jsx                  # thin shell: providers + router/tab + nav (≈120 lines)

  lib/                     # DATA LAYER (the only place that knows Supabase)
    supabase.js            # SB/KEY from import.meta.env, headers, fetch wrapper
    rest.js                # typed api(table).select/insert/update/delete
    storage.js             # receipts bucket upload
    queries/               # one file per table: trips.js, projects.js, receipts.js,
                           #   users.js, settings.js, routeCache.js

  engines/                 # PURE LOGIC — no React, no fetch (fully unit-testable)
    geocode/               # geocodeEngine: Photon→Nominatim→ArcGIS chain + cache port
    routing/               # routingEngine: OSRM call + meters→miles + cache port
    payperiod/             # payPeriodEngine: getPayPeriod, ppList, period membership
    money/                 # reimbursement rounding, totals
    reporting/             # buildReport(trips,receipts,filters) → totals & per-user
    csv/                   # toCsv(report) + mailto/email body builders

  state/                   # SHARED STATE (lifted from the monolith)
    AppStore.jsx           # context/provider: user, projs, trips, receipts, users,
                           #   settings, loaded, refresh(); replaces load()+polling
    useToast.js            # toast/show extracted
    useAuth.js             # login/signup/logout + session

  features/                # BRANCHES — one folder per feature
    auth/        (LoginScreen, SignupScreen, useAuth wiring)
    trips/       (LogTripScreen, MyTripsScreen, TripCard, useTrips, modals)
    receipts/    (ReceiptsScreen, ReceiptModal, useReceipts, compressImg)
    reports/     (ReportsScreen, filters, totals, ExportBar)
    projects/    (ProjectsScreen, AddProjectModal)
    admin/       (AdminHub, EmployeesScreen, SettingsScreen, ShareModal)

  components/              # SHARED PRIMITIVES (presentational)
    Modal.jsx  Btn.jsx  Field.jsx  Toast.jsx  Nav.jsx  StatCard.jsx  Logo.jsx

  hooks/                   # cross-cutting hooks (usePolling, useModal)

  theme/                   # WHITE-LABEL
    tokens.js              # default palette (from P) + fonts (Ft) as CSS variables
    ThemeProvider.jsx      # injects CSS vars; selects active theme
    themes/                # masterpiece.js + customer themes
    logos/                 # per-customer logo components/assets
```

### 4.2 Engine roster (single responsibility each)

| Engine | Single responsibility | Extracted from |
|---|---|---|
| **GeocodeEngine** | Address → `{lat,lng}` via Photon→Nominatim→ArcGIS, fallback order injectable. No network knowledge of caching. | 19-75 |
| **RoutingEngine** | Two addresses → driving miles (OSRM), with a pluggable cache *port* (so the cache table is a `lib` concern, not baked in). Fixes the string-vs-coords contract. | 77-116 |
| **PayPeriodEngine** | Anchor + frequency + tz + offset → `{start,end}`, plus `listPeriods()` and `isInPeriod(date)`. Drop the unused `date` arg. | 118-139, 1060-1142 |
| **MoneyEngine** | miles × rate → reimbursement, consistent rounding; total reducers. | scattered 674/714/949/1078-1080 |
| **ReportingEngine** | `(trips, receipts, filters)` → `{trips, miles, reimb, userTotals, receiptTotals}`. Pure; no `console.log`. | 1090-1153 |
| **ExportEngine (CSV/email)** | report object → CSV string, blob download payload, mailto/email body. | 1156-1258 |

Each engine is a pure module with a focused unit test; UI and `lib` depend on engines, never the reverse.

### 4.3 State that must lift into the store/context

Into `AppStore` (provider): `user`, `projs`, `trips`, `receipts`, `users`, `settings`, `loaded`, and a `refresh()` that replaces `load()` + the 15s `setInterval`. `tab` lives in the shell; `toast`/`show` move to `useToast`. **All ~50 form/modal atoms stay local** to their feature module (e.g. `rc*` belong to `features/receipts`, `eu*`/`euP` to `features/admin`). This single split removes most of the 62-hook crowding from the root.

### 4.4 StrictMode / idempotency

Re-enabling StrictMode (`main.jsx`) is a **goal of the refactor, not a prerequisite**. Make effects idempotent as features move: the only auto-running effects today are `load()` (read-only, safe) and the polling interval (read-only, safe) — the **writes are all user-triggered handlers**, so StrictMode double-invoke of *effects* is actually low-risk once `load` is the only effect. Re-enable StrictMode right after the data layer + store extraction (Phase 2), verify no duplicate network calls, and keep it on.

---

## 5. Strangler-Fig Migration Order (app builds & works after every step)

> Principle: **extract, re-import, delete** — each step moves code out of `App.jsx` into a new module and points the old call site at it. No behavior change per step; ship after each.

**Phase 0 — Safety net (no code move).**
Add Vitest. Snapshot current behavior of the pure functions by copying them into tests *before* moving them. Remove the render-time `console.log` debug (1082-1117).

**Phase 1 — Extract pure engines (zero runtime risk).**
Move `getPayPeriod`, `fmtDate`, money rounding, the report reducers, and `exportCSV`/email-body builders into `src/engines/*`. Re-import into `App.jsx`. App is byte-for-byte equivalent; engines now have tests. *Fix the `saveEdit` string-vs-coords bug here while RoutingEngine is on the bench.*

**Phase 2 — Data layer + store.**
Create `lib/supabase.js` (read `SB`/`KEY` from `import.meta.env`), `lib/rest.js`, `lib/queries/*`. Wrap `load()` + state into `state/AppStore.jsx` and `useToast`. Replace inline `api(...)` calls gradually. **Re-enable StrictMode**, verify no duplicate writes.

**Phase 3 — Theme system.**
Convert `P`/`Ft`/`iS` into `theme/tokens.js` as CSS variables behind `ThemeProvider`. Replace inline color refs feature-by-feature (mechanical). This unlocks white-label + the premium redesign without touching logic.

**Phase 4 — Extract shared components.**
Move `Modal/Btn/Fl→Field/Toast/Nav/Logo` to `src/components/`. Pure re-export.

**Phase 5 — Strangle one feature at a time** (order = lowest blast radius first):
`projects` → `receipts` → `trips` (log + my-trips + modals) → `admin` (hub/employees/settings/share) → `reports` → `auth`. For each: move screen JSX + its local hooks + its modals into `features/<name>/`, pull shared data from the store, pass actions via a feature hook. After each move, `App.jsx` shrinks and still renders the same tab.

**Phase 6 — Thin shell.**
What remains in `App.jsx` is providers + tab/router + `<Nav>`. Optionally swap the `tab` string for a real router. Add an error boundary. Done.

**Never:** a single PR that rewrites everything. Each phase is independently shippable and reversible.

---

## 6. Enables the Owner's Roadmap

- **Modular "branches/engines/modules":** §4 tree delivers it verbatim.
- **Tighter mileage accuracy:** isolated `RoutingEngine`/`GeocodeEngine` with the `saveEdit` fix and a testable cache port.
- **Receipts → reports:** already partially wired (`userReceiptTotals`, "Total Owed" at 2464-2473); `ReportingEngine` makes it first-class and CSV-complete.
- **White-label + premium redesign:** `theme/` + `ThemeProvider` + CSS variables is the single seam needed for multi-theme and per-customer logos, while keeping the Masterpiece brand as the default theme.
- **Resend email / data import:** become clean additions in `engines/csv` + a `features/import` module instead of new branches in a 3,000-line function.

# Masterpiece Mileage — Accuracy & Geospatial Audit

**Lens:** Accuracy ("pinpointness")
**Source of truth:** `src/App.jsx` (3,195 lines), cross-checked against the live Supabase schema (project `lvhqfslhcpiwshgvrnlp`).
**Goal:** Trace the full mileage-accuracy pipeline, enumerate every source of imprecision, and propose concrete precision upgrades prioritized by impact on the dollars employees actually get paid.

---

## 1. The accuracy pipeline, end to end

The reimbursable mileage for a trip is produced by this chain:

```
Project A address (free text)  ┐
                               ├─► geocode() ──► OSRM driving route ──► round to 0.1 mi ──► cache ──► trip.miles ──► reimbursement
Project B address (free text)  ┘
```

### 1.1 Address source
Addresses are free-text strings typed into a project at creation time (`saveProj`, App.jsx:848-866). There is **no validation, no autocomplete, and no normalization** — any non-empty string is accepted. The only user guidance is placeholder text (`"4521 Elm St, Denver, CO"`, App.jsx:2868) and an amber hint that a full address is "needed for accurate mileage calculation" (App.jsx:2879). The DB confirms `projects.address` is a plain `text` column defaulting to `''`.

### 1.2 Geocoding — silent three-provider fallback chain
`geocode(address)` (App.jsx:19-75) tries three providers **in sequence**, returning the first that yields any result:

| Order | Provider | Endpoint | Result limit | Line |
|-------|----------|----------|--------------|------|
| 1 | **Photon (komoot)** | `photon.komoot.io/api/?q=…&limit=1` | `limit=1` | App.jsx:24-33 |
| 2 | **Nominatim (OSM)** | `nominatim.openstreetmap.org/search?…&limit=1&countrycodes=us` | `limit=1` | App.jsx:41-51 |
| 3 | **ArcGIS** | `geocode.arcgis.com/…/findAddressCandidates?…&maxLocations=1` | `maxLocations=1` | App.jsx:59-67 |

Each provider is asked for exactly **one** candidate, and the code reads only the raw coordinates (`coordinates`, `lat`/`lon`, `location.x`/`y`). Every quality signal the providers return — Photon/ArcGIS `score`, Nominatim `importance`/`class`/`type` — is discarded. If all three fail, `geocode` returns `null` (App.jsx:73-74) and the trip falls through to manual entry.

Hardcoded `setTimeout` sleeps (300/500/300 ms before each provider, plus 300 ms between the two endpoint geocodes — App.jsx:23,40,58,90,93) are **rate-limit guards, not accuracy measures**; they add ~1.4–1.7 s of latency per uncached trip.

### 1.3 Driving distance — OSRM, no retry, no fallback
`getDrivingMiles(from, to)` (App.jsx:77-116):
1. Checks the `route_distances` cache by exact address text (App.jsx:79).
2. On miss, geocodes both endpoints (App.jsx:88-92).
3. Calls the **public OSRM demo server** `router.project-osrm.org/route/v1/driving/…?overview=false` (App.jsx:94-95).
4. Any non-OK status or `code !== "Ok"` **throws** (App.jsx:97-100); the catch returns `null` (App.jsx:112-114).

There is **no retry, no second routing provider, and no straight-line fallback**. A single transient `429`/`503` from the shared demo server discards the entire measured route.

### 1.4 Rounding
- Distance: meters → miles → `Math.round(d * 0.000621371 * 10) / 10` → **0.1-mile precision** (App.jsx:101).
- Reimbursement: `Math.round(miles * irs_rate * 100) / 100` → **cents** (App.jsx:674).

The 0.1-mile-rounded value is what gets cached and reused forever, so the rounding is baked into every future report.

### 1.5 Persistence
On success the mileage is cached into `route_distances` (`merge-duplicates`, App.jsx:103-107) and the trip row is written with denormalized `from_address`, `to_address`, `miles`, and `reimbursement` snapshots (App.jsx:681-690).

---

## 2. Sources of imprecision (exhaustive)

### A. No address validation or autocomplete (HIGH impact)
A misspelled, partial, or ambiguous address (`"Henderson"`, `"4521 Elm"`) is accepted verbatim and geocoded to **whatever the first provider guesses**. There is no "did you mean…" step and no rooftop/interpolated confirmation. This is the root cause of most silent errors, because a bad point poisons every trip and every report that uses that project.

### B. `limit=1` + first-provider-wins = no disambiguation (HIGH)
Every provider returns only its top candidate, and the chain stops at the first non-empty answer. The app cannot tell a rooftop match from a street centroid from a city centroid. Photon (coarse) is tried **first**; ArcGIS (best US rooftop accuracy) is tried **last**, so the strongest geocoder is only consulted when the two weaker ones fail.

### C. Inconsistent provider results across one report (MEDIUM-HIGH)
Because different addresses can resolve via different providers, two trips in the same pay-period report can be measured at different precision tiers. There is no provider-priority policy and no agreement/confidence check.

### D. Silent fallback hides failures (HIGH)
Provider errors are only `console.error`'d (App.jsx:36,54,70). A non-technical owner has no visibility that Photon failed and ArcGIS silently supplied a coarser point. The mileage looks authoritative regardless of how it was derived.

### E. OSRM flakiness with no resilience (HIGH)
The public OSRM demo server is rate-limited and explicitly "for testing only." With no retry and no alternate router, transient failures route the user straight to **hand-typed mileage** (App.jsx:669-672) — the least accurate possible outcome.

### F. Manual entry is unvalidated and unflagged (HIGH)
`saveManualTrip` accepts any number `> 0` (App.jsx:706-709). The trip record has **no field marking it as manual vs. measured**, so reports cannot distinguish a GPS-grade figure from a guess. Over a pay period these blend invisibly into the total owed.

### G. No straight-line safety net (MEDIUM)
Haversine distance is never computed. A great-circle estimate (even × a road-curvature factor) would be far better than asking a human to invent a number, and could be shown as "estimated."

### H. Cache keyed on exact address text, never expires (MEDIUM-HIGH)
`route_distances` is keyed on raw `from_address`/`to_address` strings (App.jsx:79) and is **directional** (A→B and B→A are separate rows). The schema has a `verified_at` column but the code never reads it — there is **no TTL**. Consequences:
- A corrected/reformatted address **misses** the cache and creates a parallel row, so corrections don't propagate.
- A wrong cached mileage is **permanent** until someone hand-edits the database.
- Whitespace/case differences fragment the cache (no normalization on the key).

### I. Geocode results are never persisted (MEDIUM — also wasteful)
The `projects` table **already has `lat` and `lng` numeric columns**, but App.jsx never reads or writes them (grep confirms `lat`/`lng` appear only inside `geocode()` return values and the OSRM URL). Every trip re-geocodes both endpoints from scratch. There is no place to store a **one-time, human-verified coordinate**, so a project's resolved point can drift if a provider changes its answer.

### J. Rounding compounds through the cache (LOW)
0.1-mile rounding at measurement time (App.jsx:101) is reused indefinitely; acceptable, but it means the report total is a sum of pre-rounded legs rather than a rounded sum.

### K. Frozen historical snapshots (LOW-MEDIUM)
Trips snapshot address + miles at log time (App.jsx:681-690). Correcting a project address does **not** recalculate past trips — a bad early geocode is frozen into every historical report with no recompute path.

---

## 3. Confirmed bugs found while tracing

### Bug 1 — Edit-trip path passes coordinates where strings are expected (HIGH)
In `saveEdit`, the addresses are geocoded into coordinate objects and then passed to `getDrivingMiles`:

```js
const fG = await geocode(fP.address);   // App.jsx:943  → {lat, lng}
const tG = await geocode(tP.address);   // App.jsx:944  → {lat, lng}
if (fG && tG) {
  const m = await getDrivingMiles(fG, tG); // App.jsx:946  ← WRONG: expects strings
```

`getDrivingMiles` does `encodeURIComponent(from)` for the cache lookup (App.jsx:79) — on an object that serializes to `"[object Object]"` — and then calls `geocode(from)` **again** on the object (App.jsx:88), which fails. Net effect: **editing a trip's from/to silently keeps the OLD mileage** even though the route changed. The non-edit `logTrip` path passes address strings correctly (App.jsx:668).

### Bug 2 — `projects.lat`/`lng` columns are dead (HIGH leverage)
The schema provisions per-project coordinates, but no code populates or consumes them. This is the missing "source of truth" that would make geocoding deterministic, cacheable, and human-correctable.

---

## 4. Recommended precision upgrades (prioritized by $ impact)

### P0 — Stop silently losing measured routes
1. **Harden OSRM**: wrap the routing call in a retry (e.g., 2–3 attempts with backoff) and add a fallback. Order: OSRM → retry → a second routing endpoint (self-hosted OSRM or a keyed provider) → **haversine × road factor as a labeled estimate** → only then manual entry.
2. **Fix Bug 1**: change `saveEdit` to call `getDrivingMiles(fP.address, tP.address)` so edited trips recalculate correctly.
3. **Flag manual & estimated mileage** on the trip record (e.g., `source: 'osrm' | 'estimate' | 'manual'`) and surface it in reports so estimates are auditable.

### P1 — Make each project's location a deterministic, correctable source of truth
4. **Geocode once, store the point**: on project save, geocode and write `projects.lat`/`lng` (already in the schema) plus a `geocode_provider` and `geocode_confidence`. Route from stored coordinates, not from re-geocoded text.
5. **Deterministic provider priority + confidence score**: query providers, prefer the best **rooftop/point-address** match (favor ArcGIS for US rooftops), record each provider's score, and **flag low-confidence results** for human confirmation instead of silently accepting them.
6. **Manual coordinate correction path**: let an admin drop/adjust a pin (or paste lat/lng) on a project when the geocode is wrong, locking the verified point.

### P2 — Validate at the source and fix the cache
7. **Address autocomplete/validation at project entry**: integrate an autocomplete (ArcGIS/Mapbox/Google Places) so the address is a validated, normalized, geocodable string before it is ever saved.
8. **Robust cache keys**: key the route cache on **stored coordinates** (rounded to a fixed precision), not raw address text; store it order-independent (canonicalize A/B); and **honor `verified_at`** with a TTL so stale entries can be revalidated.
9. **Recompute path**: when a project address/coordinate changes, offer to recalculate affected trips (or at least flag them as stale) rather than freezing old mileage.

### P3 — Polish
10. Sum-then-round report totals; show per-leg precision/source in the report; remove the latency-only `setTimeout` throttles once geocoding moves to project-save time (far fewer calls).

---

## 5. Security note (incidental, surfaced by schema audit)
The Supabase advisor reports **RLS disabled** on `public.hanger_reference` and `public.urgent_reports` — fully exposed to the anon key. Out of scope for accuracy but flagged here because it was discovered during this audit; remediation should be decided with appropriate policies (do not blanket-enable RLS without policies).

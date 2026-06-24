# Masterpiece Mileage — Security Audit

**Lens:** Security engineering
**Target:** `src/App.jsx` (single-file React app, ~3,195 lines) + live Supabase project `lvhqfslhcpiwshgvrnlp`
**Date:** 2026-06-24
**Auditor scope:** Supabase key exposure & RLS, PIN authentication, input validation, XSS surface, privacy/data exposure, plus a Terms & Conditions / Privacy Policy requirements checklist.

---

## 1. Executive Summary

The application ships a hardcoded Supabase **anon** key and talks to the database over raw PostgREST. **That key being public is not the bug** — anon keys are designed to be embedded in the browser, and the real access boundary is Postgres Row Level Security (RLS). The bug is that **RLS is enabled but neutered**: every application table carries a policy of the form `FOR ALL TO public USING (true) WITH CHECK (true)`. As a result, anyone who opens the site, reads the anon key out of the JavaScript bundle, and issues REST calls can **read, modify, and delete every row in every table** — including the table that stores login PINs in plaintext.

Authentication is a **client-side plaintext-PIN comparison** against a fully downloadable user list. There is no server-side identity, so the one correctly written RLS policy (a `trips` rule keyed on `auth.uid()`) is dead code. The receipts image bucket is **public and globally writable/deletable** by the anon role. Location history and financial receipts are stored with **zero tenant isolation** — a blocker for the planned multi-customer white-label model.

XSS surface is genuinely low (no `dangerouslySetInnerHTML`, no `eval`, React auto-escaping). The dominant risks are authorization and data-exposure, not injection.

---

## 2. The Hardcoded Supabase Key — Correctly Understood

```js
// App.jsx:3-4
const SB  = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJ...";  // decoded: { iss:"supabase", role:"anon", exp:2091341913 (2036-04-09) }
```

Decoding the JWT confirms `role: anon`. **This is the intended public client key.** Supabase's security model assumes the anon key is visible to every visitor; it is not a secret. Rotating it or hiding it would change nothing about the real exposure below, and removing it would break the app. So the correct framing for the owner is:

> "The key in the code is supposed to be public. The problem is what that key is *allowed to do* — and right now it's allowed to do everything."

The actual control surface is **Row Level Security**. We audited it directly.

### What RLS is actually doing (verified against the live database)

`pg_policies` for the `public` schema shows, for **every** application table:

| Table | Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|---|
| `yard_users` | Allow all access | ALL | public | `true` | `true` |
| `trips` | `trips_all` | ALL | public | `true` | `true` |
| `trips` | Admins view all / users view own | SELECT | public | `auth.uid()...` | — |
| `receipts` | `all_access` | ALL | public | `true` | `true` |
| `route_distances` | `all_access` | ALL | public | `true` | `true` |
| `projects` | Allow all access | ALL | public | `true` | `true` |
| `mileage_settings` | `settings_all` | ALL | public | `true` | `true` |
| `categories`, `materials`, `tools`, `tool_checkouts`, `transactions` | Allow all access | ALL | public | `true` | `true` |

**Net effect: RLS provides no protection.** The `USING(true)/WITH CHECK(true)` policies grant the anon role unrestricted SELECT/INSERT/UPDATE/DELETE. Supabase's own linter flags this as `rls_policy_always_true` on **12 tables**.

The single well-intentioned policy — `trips` SELECT keyed on `auth.uid()` — **never fires**, for two compounding reasons:

1. The app authenticates Postgres requests with the static anon key and **never establishes a Supabase Auth session**, so `auth.uid()` is `NULL`.
2. Even if it did, RLS policies are **OR-combined**, and the permissive `trips_all` ALL policy would override the restrictive one.

Additionally, **two tables have RLS entirely disabled** (`rls_enabled = false`): `public.hanger_reference` and `public.urgent_reports`. The latter holds `user_name`, `user_id`, and `message` and is fully open to anon read/write (linter: `rls_disabled_in_public`, ERROR).

### Concrete attack, no special tooling required

```
GET https://lvhqfslhcpiwshgvrnlp.supabase.co/rest/v1/yard_users?select=name,pin,role
    apikey: <anon key copied from the page source>
→ returns every employee's name, plaintext 4-digit PIN, and role.
```
The attacker can then `PATCH yard_users?id=eq.<victim>` to set `role=super_admin`, or `DELETE` any trip/receipt/user. This is a complete confidentiality + integrity compromise.

---

## 3. PIN Authentication — Client-Side and Plaintext

```js
// App.jsx:600-620 (login)
const all = await api("yard_users?active=eq.true");
const found = all.find(
  u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin
);
if (!found) { setAErr("Name or PIN not found."); return; }
setUser(found);
```

Problems, in order of severity:

1. **PINs stored in plaintext.** Schema: `yard_users.pin text`. Written plaintext on signup (App.jsx:641) and admin edit (App.jsx:1035). No hash, no salt.
2. **The PIN list is downloadable.** Because RLS is open, `login()` literally pulls every active user (with PINs) to the client to compare. An attacker doesn't even need to guess — the answer key is handed over.
3. **Auth decision is 100% client-side.** `setUser(found)` is the entire "session." Admin gates `isA`/`isS` (App.jsx:561-562) are client booleans. The database does not know or care who is calling — every request is just "the anon role," which can do anything.
4. **4-digit keyspace, no rate limiting.** 10,000 combinations, brute-forceable in seconds against the open REST endpoint even without the download shortcut.
5. **PIN input is not masked** (App.jsx:1396-1409 is a plain text input, not `type="password"`) — shoulder-surfing on shared devices.
6. **Privilege escalation is unauthenticated.** `chRole()` (App.jsx:1011) and `saveEU()` (App.jsx:1024) PATCH `yard_users.role` with no server check; the open policy means anyone can promote anyone.

**The fix is architectural:** move to real Supabase Auth (email magic-link or email+password), let Postgres issue a per-user JWT so `auth.uid()` is real, store no secret comparison in the client, and back every table with RLS keyed on `auth.uid()` and a role lookup. If a PIN-style UX must be retained, it should be a server-verified secondary factor over an authenticated session — never the primary, client-evaluated credential.

---

## 4. Storage / Receipts Exposure

```js
// App.jsx:788-795
const path = `${tgt.id}/${Date.now()}.jpg`;
await fetch(`${SB}/storage/v1/object/receipts/${path}`, { method:"POST", ... });
imageUrl = `${SB}/storage/v1/object/public/receipts/${path}`;
```

Verified against the live project:

- Bucket `receipts` has `public = true`.
- `storage.objects` policies grant the **public** role `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, each gated only on `bucket_id = 'receipts'` — **no per-user path restriction**.

So any anon caller can **list, download, overwrite, or delete every user's receipt image**. Receipts are financial documents (often showing names, card fragments, vendors, amounts). The linter flags `public_bucket_allows_listing`. The object path embeds the user id and a timestamp, and the full public URL is persisted in `receipts.image_url` (which is itself in an open table).

**Fix:** make the bucket private; serve images via short-lived signed URLs; scope storage policies to `auth.uid()::text = (storage.foldername(name))[1]` so a user can only touch their own folder; admins via a role check.

---

## 5. Input Validation & Injection

`api()` (App.jsx:12-17) performs no validation:
```js
async function api(path, opts = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H, ...opts });
  ...
}
```
Call sites interpolate user values into PostgREST filters but wrap them in `encodeURIComponent` (e.g. App.jsx:79, 630, 839, 1000). For the equality filters used, this prevents query-parameter breakout, so this is **not** classic SQL injection. However:

- There is **no length, type, or shape validation** server-side on `note`, `name`, `address`, etc. Because writes are open, an attacker can store arbitrarily large or malformed values.
- Numeric inputs (`amount`, `miles`, `irs_rate`) are validated only with client-side `parseFloat` (App.jsx:706, 777, 873). Nothing stops a direct REST write with negative or absurd values, corrupting reimbursement totals.
- `email` uniqueness is checked client-side (App.jsx:629) but enforced by a DB unique constraint (good) — the only validation actually backed by the database.

**Fix:** once real RLS/auth exists, add DB-level `CHECK` constraints (amount ≥ 0, miles ≥ 0, sane bounds) and column length limits, and treat client validation as UX-only.

---

## 6. XSS / Output Handling

- **No `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no `document.write`** anywhere in `App.jsx` (confirmed by grep). React escapes all interpolated text, so stored notes/names/addresses render safely as text. **Stored-XSS surface is low.**
- The one untrusted-URL sink is `window.open(r.image_url, "_blank")` (App.jsx:1857). Because `image_url` lives in an attacker-writable table, a malicious `javascript:`/`data:` URL could be stored. `window.open` of a cross-origin URL is low impact, but the scheme should be validated (allow only `https:` to the receipts host).
- `mailto:`/`sms:` deep links (App.jsx:989, 1251) embed report data via `encodeURIComponent` — fine.

---

## 7. Privacy & Data Exposure

This app collects and stores **precise location history** and **financial data**:

- `trips` (192 rows): `from_address`, `to_address` (free-text street addresses), `user_name`, `miles`, `reimbursement`, `trip_date`. A movement log of named individuals.
- `projects` (92 rows): `address`, `lat`, `lng`.
- `receipts`: `amount`, `image_url` (photographed financial documents), `user_name`.
- `yard_users`: `email`, `name`, plaintext `pin`, `role`.

All of the above is currently exposed to anyone with the anon key. Even after RLS is fixed, this is **sensitive personal + financial data** that triggers privacy-law obligations.

**Third-party processors receiving address data** (must be disclosed):
- Photon / komoot — `photon.komoot.io` (App.jsx:24)
- Nominatim / OpenStreetMap — `nominatim.openstreetmap.org` (App.jsx:41)
- ArcGIS / Esri — `geocode.arcgis.com` (App.jsx:59)
- OSRM — `router.project-osrm.org` (App.jsx:95)
- Supabase (hosting/storage/DB) — the data controller's processor

**Verbose PII logging:** `console.log` statements dump all trip dates, user names, geocoded addresses, and the current user's id/role (App.jsx:20, 81, 1082-1117). On shared/kiosk devices this leaks into browser history and devtools. Strip these from production.

---

## 8. Prioritized Remediation Plan

### P0 — Do before any real/customer data or multi-tenant use
1. **Replace permissive RLS with real policies.** Drop every `USING(true)` ALL policy; write per-table policies keyed on `auth.uid()` (own rows) plus an admin/role check. Enable RLS on `hanger_reference` and `urgent_reports`.
2. **Adopt real authentication.** Move to Supabase Auth so requests carry a per-user JWT and `auth.uid()` is meaningful. Retire the client-side plaintext-PIN comparison.
3. **Stop storing PINs in plaintext.** If retained as a UX factor, verify server-side over an authenticated session; never download the PIN list to the client.
4. **Lock down the receipts bucket.** Make it private, scope storage policies to the owner's folder, serve via signed URLs.

### P1 — High
5. **Server-side authorization for role/user changes.** Restrict `role`/user mutations to admins via RLS + a `SECURITY DEFINER` function; block anonymous escalation.
6. **DB-level validation.** `CHECK` constraints and length caps on numeric and text columns.
7. **Remove PII `console.log` statements** from production builds.

### P2 — Medium
8. **Mask the PIN input** (`type="password"` / `inputMode="numeric"`).
9. **Validate `image_url` scheme** before `window.open`; allow only `https:` to the storage host.
10. **Add rate limiting / lockout** on login (edge function or Supabase Auth built-ins).

### P3 — Hardening / hygiene
11. **Pin a strict CSP** and security headers at the hosting layer to constrain script/connect origins.
12. **Add an audit trail** (immutable log) for admin actions on trips, receipts, and user roles.
13. **Document a data-retention & deletion policy** in code (e.g., purge old geocode cache, support user deletion).

---

## 9. Terms & Conditions + Privacy Policy — Required Coverage

A lawyer can draft from the checklist below; each item is grounded in what the code actually does.

### Privacy Policy must cover
- **Identity of the data controller.** Who operates the service (the company), and — critically for white-label — clarify whether each customer/tenant is a separate controller and the platform is a processor. This must be settled before customers drop in their own logos and onboard their own employees.
- **Categories of personal data collected:** name, email, login PIN; **precise location data** (origin/destination street addresses, project coordinates, computed mileage); **financial data** (reimbursement amounts and uploaded receipt images, which may themselves contain further personal/financial detail).
- **Purpose and legal basis** for processing (employment mileage reimbursement / expense reconciliation).
- **Location tracking specifics:** that trip origin/destination addresses are recorded and retained as a movement history; whether any device GPS is used (currently web geolocation is limited, but disclose if added).
- **Third-party processors / sub-processors and international transfer:** addresses are transmitted to **Photon/komoot, Nominatim/OpenStreetMap, ArcGIS/Esri, and OSRM** for geocoding/routing, and data is hosted on **Supabase**. Name them, state what is shared (addresses/coordinates), and link their policies.
- **Receipt/image handling:** that uploaded images are stored and how they are protected (post-remediation: private bucket, signed URLs).
- **Data retention:** how long trips, receipts, geocode cache, and accounts are kept, and deletion triggers.
- **Data subject / user rights:** access, correction, export (a CSV export exists at App.jsx:1156), and **deletion** — including a concrete account-and-data deletion path.
- **Security measures:** authentication, encryption in transit, access controls (to be truthful only after P0/P1 are done — do not claim controls that aren't implemented).
- **Children / eligibility:** workforce app, not for minors.
- **Breach notification** commitments and contact details for privacy inquiries.
- **Changes-to-policy** mechanism and effective date.

### Terms & Conditions must cover
- **Acceptable use** — authorized employees only; no submitting false mileage/receipts; consequences of misuse.
- **Accuracy disclaimer** — mileage is computed via third-party geocoding/routing (Photon→Nominatim→ArcGIS→OSRM, App.jsx:19-116) and **OSRM is known to be flaky**; distances are estimates, the employer's reimbursement determination is authoritative, and there is a manual-miles override (App.jsx:705).
- **No tax/legal advice** — the IRS-rate figure is configurable (App.jsx:497, 868) and the app does not provide tax advice.
- **Account responsibility** — users keep credentials confidential (and, post-remediation, that the auth mechanism is for authorized access only).
- **Service availability / "as is"** — no warranty; dependence on third-party services that may be unavailable.
- **Limitation of liability and indemnification.**
- **Intellectual property** — including, for white-label, that each customer retains rights to its own uploaded logo/branding and the data of its users.
- **Data ownership & controllership** between platform operator and customer tenants (mirrors the controller/processor split above).
- **Termination & data return/deletion** on account or contract end.
- **Governing law / jurisdiction** and a **changes-to-terms** clause.

---

## 10. Appendix — Evidence Index

| Claim | Location |
|---|---|
| Hardcoded anon key (role:anon, exp 2036) | App.jsx:3-4 |
| `api()` helper, no validation | App.jsx:12-17 |
| Geocoders: Photon / Nominatim / ArcGIS | App.jsx:24 / 41 / 59 |
| OSRM routing | App.jsx:94-101 |
| Client-side plaintext PIN login | App.jsx:600-620 (compare at 609) |
| PIN stored plaintext (signup/edit) | App.jsx:641 / 1035 |
| Client-side admin gates | App.jsx:561-562 |
| Role change, no server authz | App.jsx:1011 / 1024 |
| Receipt upload to public bucket | App.jsx:788-795 |
| `window.open(image_url)` | App.jsx:1857 |
| PII console logging | App.jsx:20, 81, 1082-1117 |
| RLS: `USING(true)` ALL policies on all tables | live `pg_policies` (Supabase) |
| Receipts bucket public + anon CRUD policies | live `storage.objects` policies |
| RLS disabled: `hanger_reference`, `urgent_reports` | Supabase advisor `rls_disabled_in_public` |

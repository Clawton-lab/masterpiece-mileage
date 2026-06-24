# Masterpiece Mileage — Master Build Roadmap

*One plan. Sequenced so the app keeps working after every step.*

---

## How to read this

This roadmap turns six expert reviews of the app into a single ordered build plan. It is written for **you (Stephen)** working with an AI coding agent — not for a room full of engineers.

A few ground rules baked into this plan:

- **No big rewrites.** The whole app is one giant file today (`src/App.jsx`, 3,195 lines). We do **not** rebuild it from scratch. We pull pieces out one at a time, the app keeps shipping, and you can stop or roll back at any phase. This is called the "strangler" approach — the old code is gradually replaced piece by piece.
- **Every phase ends shippable.** After each phase the app still builds and works. You never end a session with a broken app.
- **Effort labels:** S = a few hours, M = about a day, L = a few days, XL = a week+. These assume an AI agent doing the typing.
- **"Needs your eyes" vs "agent can run solo":** Anything about how it *looks* or *feels* (colors, glow, premium polish, your brand) needs **you** to judge. Anything mechanical (moving code, adding columns, writing tests) the **agent can do autonomously** and just report back.

**Two things are true and urgent up front, so read these first:**

1. **The app has a serious security hole today.** Right now anyone who visits the site can read every employee's login PIN, every trip address, and every receipt — and even make themselves an admin — with no password. This is fine *only* because it's a small private tool today. It is **not safe to put a second paying customer on it.** Phases 2 and 8 fix this, and white-label (multiple customers) is **blocked** until they're done.
2. **There is a real mileage bug shipping right now.** When you *edit* a trip's start/end, the new mileage silently doesn't recalculate — it keeps the old number (confirmed at `App.jsx:946`). Phase 1 fixes this in the first hour.

---

## The big picture (phase order at a glance)

```
Phase 0  Safety net (tests) ───────────────┐
Phase 1  Quick wins & confirmed bug fixes   │  foundation —
Phase 2  Real login + lock down the data    │  do these first
Phase 3  Pull logic into "engines"          │
Phase 4  Design tokens (the color/style kit)┘
         │
         ├── Phase 5  Mileage accuracy        (self-contained)
         ├── Phase 6  Receipts → reports      (self-contained)
         │
Phase 7  The award-winning redesign      (needs Phase 4)
Phase 8  Break the monolith into modules (needs Phases 2–4)
Phase 9  White-label / multiple customers (needs Phases 4, 7, 8 + security)
Phase 10 Legal: privacy policy & terms   (needs Phase 2)
```

---

## Phase 0 — Build a safety net before touching anything

**Goal:** Make it safe to change the code by capturing how the math works *today*, so we can prove later changes didn't break the numbers.

**Why first:** The app calculates money (reimbursements). If a refactor quietly changes a total, you'd never know. Tests catch that instantly.

**Work:**
- Add Vitest (a test runner) to the project.
- Write a handful of "characterization" tests that lock in today's behavior for the pure math: pay-period dates (`getPayPeriod`), mileage rounding, the report totals, and CSV output.

**Depends on:** Nothing (real Vite project + git already exist).

**Effort:** M

**Agent can do this solo.** No design judgment needed.

**Done when:** `npm test` runs and passes, and there's at least one test each for pay-period dates, mileage rounding, report totals, and CSV format.

---

## Phase 1 — Quick wins & confirmed bug fixes

**Goal:** Fix the known, concrete bugs and clean up noise — small, high-confidence changes that immediately make the app more correct.

**Why now:** These are real defects affecting real numbers and they're cheap. No reason to wait.

**Work:**
- **Fix the edit-trip mileage bug** (`App.jsx:946`). When you edit a trip, the code passes the wrong kind of value into the distance function, so the mileage never updates. Fix it to pass the addresses. ⚠️ **Heads-up for you:** after this fix, editing a trip will *change* its mileage to the correct value — so previously-edited trips that look "wrong" were a side effect of this bug.
- **Remove the debug logging** that dumps all trip data, names, and addresses to the browser console on every screen refresh (`App.jsx:1082-1088`, `1115-1117`, and the geocode logs). This is both noise and a privacy leak on shared devices.
- **Replace the wrong-brand favicon and theme color.** The browser-tab icon and color are leftover generic Vite blue (`index.html:7`, `public/favicon.svg`) — they share no colors with your actual cream/red/ink brand. Swap in your paintbrush "M" mark and brand colors.
- **Mask the PIN field** so it shows dots instead of the typed number (`App.jsx:1396`).

**Depends on:** Phase 0 (so the bug fix is covered by a test).

**Effort:** S

**Mostly agent-solo.** The favicon swap **needs your eyes** to confirm it looks right.

**Done when:** Editing a trip's start/end recalculates and saves the new mileage; the console is quiet on normal use; the browser tab shows your brand mark, not blue; and PINs show as dots.

---

## Phase 2 — Real login and lock down the data (SECURITY — do early)

**Goal:** Stop anyone on the internet from reading PINs, trips, and receipts or making themselves an admin. Turn the app from "trusts the browser" into "the database enforces who can see what."

**Why now (and why it's a single coordinated change):** Today login happens entirely in the browser — it downloads everyone's PIN and checks it in JavaScript. The database has its security "rules" technically turned on but set to *allow everyone everything*. Fixing the database rules **without** first adding real logins would lock everyone out, so these two pieces must land together.

**Work:**
- **Move to real authentication** (Supabase Auth — email + password or magic link) so each logged-in person carries a real identity the database can check. Retire the browser-side PIN comparison.
- **Stop storing PINs in plain text.** If you want to keep a PIN-style login, it must be checked on the server, never downloaded to the browser.
- **Rewrite the database access rules** so each person can only see their own data (and admins can see their team's), instead of the current "everyone can read/write/delete everything." Turn on protection for the two tables that currently have none.
- **Make the receipts image storage private.** Today every receipt photo is viewable by anyone with the link. Scope it per-user and serve images through short-lived secure links.
- **Lock down admin actions** (changing someone's role, deleting users) so they can't be triggered by an anonymous request.
- **Add basic limits** so the database rejects garbage (negative amounts, absurdly long text) and brute-force PIN guessing is slowed down.

**Depends on:** Phase 1 (clean baseline). Strongly recommended to do this against a **staging copy** of the database first so you can't lock yourself out.

**Effort:** XL

**Agent does the work, but you must test the login flow yourself** before cutover — log in as yourself and as a test employee to confirm nobody's locked out.

**Done when:** Logging out and hitting the database directly (without logging in) returns *nothing* — no PINs, no trips, no receipts; a normal employee cannot see another employee's data; receipt images are not publicly viewable by raw URL; and no anonymous request can promote an account to admin.

> ⚠️ This is the single most important phase for protecting your users. It is also the prerequisite for ever onboarding a second customer (Phase 9).

---

## Phase 3 — Pull the logic out into reusable "engines"

**Goal:** Take the self-contained calculations out of the giant file and put them in small, focused files (the "engines" you wanted), with **zero change to behavior.**

**Why now:** This is the first real step of the modular architecture. Pure math is the *safest* thing to move (no UI, no database), and Phase 0's tests prove we didn't break anything. It also sets up Phases 5 and 6.

**Work:**
- Create a `src/lib` data layer: move the Supabase address/key into environment config, and put the `api()` helper and queries in one place instead of scattered raw fetches.
- Extract pure engines into their own files: **pay-period**, **money/rounding**, **reporting totals**, **CSV builder**, **geocoding**, **routing**. Re-import them into the big file — the app should look and behave identically.
- Extract the 7 small shared UI pieces (Modal, Button, Field, Toast, Nav, Logo, a stat card) into `src/components`.

**Depends on:** Phase 0 (tests guard the move).

**Effort:** L

**Agent can do this solo.** Tests confirm correctness; no design judgment.

**Done when:** The math lives in separate files, every Phase 0 test still passes, the app builds and behaves exactly as before, and the database key is read from config instead of being hardcoded.

---

## Phase 4 — Build the design "token" kit (the foundation for looks)

**Goal:** Define your brand once — colors, fonts, spacing, shadows — as named values ("tokens") that the whole app reads from, instead of 235 hand-typed style blocks. **The app looks identical after this**; it's plumbing, not a redesign.

**Why now:** This is the hinge of the whole plan. **Both** the premium redesign (Phase 7) **and** white-label theming (Phase 9) are impossible to do cleanly until colors come from one switchable place. Your real brand already exists in the code (cream paper, artist red, ink black, tan canvas, the Bitter/Source Sans/Plex Mono fonts, the paint-stripe motif) — this phase preserves it exactly and makes it overridable.

**Work:**
- Convert the hardcoded color object `P` and font object `Ft` into CSS variables, with a compatibility shim so existing styles keep working.
- Define modest, consistent scales for text sizes, spacing, corner radius, and shadow depth (today these are ad-hoc: 9 different corner radii, 15 different font sizes).
- Migrate styles to read from the tokens, screen by screen, verifying each screen looks unchanged.

**Depends on:** Phase 3 (cleaner code to migrate).

**Effort:** L

**Agent does the migration; you spot-check each screen** to confirm nothing shifted visually.

**Done when:** Changing one color variable in one place re-colors the whole app, and every screen looks pixel-identical to before the change.

---

## Phase 5 — Tighter mileage accuracy (self-contained)

**Goal:** Make the miles — and therefore the dollars — trustworthy and reproducible.

**Why here:** It's mostly independent of the redesign, so it can run in parallel with design work once the engines exist (Phase 3). It directly serves your "tighter mileage accuracy" goal.

**Work:**
- **Harden the routing.** The free OSRM server is flaky and is the reason the app keeps asking people to type mileage by hand. Add retry-with-backoff, then a backup route source, then a clearly-labeled straight-line estimate — only *then* fall back to manual entry.
- **Geocode each project once and save the coordinates.** The `projects` table already has unused `lat`/`lng` columns. Save the location when a project is created (with a confidence score), and route from those saved points instead of re-looking-up the address on every single trip.
- **Tag every trip's mileage source** (measured / estimated / hand-typed) and show it in reports, so you can see which numbers are guesses.
- **Add an admin "fix this location" path** (paste/adjust coordinates) for when an address geocodes wrong.
- **Add address autocomplete/validation** at project creation so addresses are clean before they're saved.
- **Rework the route cache** so it keys on coordinates (not exact typed text), works both directions, and can expire/revalidate stale entries.

**Depends on:** Phase 3 (geocoding/routing engines extracted). Phase 0 tests guard the rounding.

**Effort:** L

**Mostly agent-solo.** You may want to eyeball a few real routes to confirm the numbers look right.

**Done when:** A flaky route attempt no longer dumps you straight to manual entry; projects store their coordinates and stop re-geocoding every trip; and reports clearly mark which trips were measured vs estimated vs hand-typed.

---

## Phase 6 — Receipts flow fully into reports (self-contained)

**Goal:** Make receipts a first-class part of reports — totals, line items, categories, images — so a report shows the true "total owed."

**Why here:** Receipts are *partly* wired into reports already, so this is targeted finishing work, independent of the redesign. It directly serves your "receipts flowing into reports" goal.

**Work:**
- **Add a `category` field to receipts** (fuel, materials, lodging, etc.) with a dropdown in the receipt screen.
- **Unify the report math into one builder** that returns miles, mileage reimbursement, receipt total, grand total, and per-category breakdown — and feed the on-screen view, CSV, print, and email all from that one source. (Today the CSV and the email build their numbers *differently*, which is a drift risk.)
- **Fix the emailed report** — it currently omits receipts entirely.
- **Add receipts to the headline summary** at the top of the report (today it only shows miles + mileage reimbursement).
- **Show per-receipt line items** (date, category, note, amount, image link) under each employee.
- **Stop receipts from vanishing** when the "Rejected" toggle is on.
- **Decide the fate of the unused receipt `status` column** — either build an approve/reject flow like trips have, or remove it. Document the choice.

**Depends on:** Phase 3 (reporting engine extracted). Best if Phase 2's storage lockdown is done so receipt images aren't public.

**Effort:** L

**Mostly agent-solo.** You decide the category list and whether receipts need approve/reject.

**Done when:** A report's "total owed" includes receipts; the on-screen, CSV, printed, and emailed versions all show the same receipt numbers; receipts appear as line items with category and image link; and receipts no longer disappear under the Rejected toggle.

---

## Phase 7 — The award-winning, premium redesign

**Goal:** Make the app feel hyperrealistic and premium — glowing hover buttons, real depth/shadows, smooth motion, focus rings — **while keeping your existing brand exactly.**

**Why now:** This needs the token kit (Phase 4) so the new polish is applied consistently and doesn't fight white-label later. It's the most *taste-driven* phase, so it's yours to steer.

**Work:**
- **Upgrade the shared Button and input styles** with glowing hover lift, a pressed state, and visible keyboard focus rings. This one change touches every screen at once and is the highest-impact "wow."
- **Add real elevation/depth** to cards (the KPI tiles, trip/receipt/report cards), replacing today's flat 1px-border look — while keeping your signature colored accent edges and paint-stripe.
- **Normalize the scattered sizes/radii** onto the clean scales from Phase 4 so the whole UI reads as one coherent system.
- **Add tasteful motion** with a `prefers-reduced-motion` guard for accessibility.
- **Protect printed reports:** make sure new shadows/glows/dark backgrounds are neutralized when printing so reports don't waste ink or render poorly.

**Depends on:** Phase 4 (tokens). Benefits from Phase 8 components but doesn't require it.

**Effort:** L

**This one is YOURS to judge.** The agent builds options; **you** decide what feels premium vs overdone. Expect a few back-and-forth rounds. Test glow/blur on a real phone — heavy effects can hurt low-end devices.

**Done when:** Buttons glow and lift on hover, keyboard focus is clearly visible, cards have real depth, the whole app feels cohesive and premium, your brand is unmistakably preserved, **and** a printed report still looks clean.

---

## Phase 8 — Break the monolith into feature modules

**Goal:** Finish the "branches/engines/modules" architecture: turn the one giant file into a thin shell plus separate feature folders (trips, receipts, reports, projects, admin, auth).

**Why here:** With the engines (Phase 3), the data layer, and the tokens (Phase 4) in place, the remaining screens can be moved out one at a time safely. This makes every future change faster and lower-risk — but it's deliberately *after* the high-value user-facing wins so you get benefits early.

**Work:**
- Lift the ~9 truly shared pieces of state (current user, projects, trips, receipts, etc.) into a small shared store, and replace the every-15-seconds full reload with a smarter refresh.
- Move each screen into its own `features/<name>/` folder, one at a time, in low-risk order (projects → receipts → trips → admin → reports → auth), keeping the app working after each move.
- Shrink the main file to a thin shell (providers + navigation) and add a top-level error boundary so one screen crashing doesn't take down the whole app.
- Make the effects safe to re-enable React StrictMode, then turn it back on and confirm no duplicate database writes.

**Depends on:** Phases 2, 3, 4.

**Effort:** XL

**Agent can do this solo**, verifying after each screen move. No design judgment.

**Done when:** Each screen lives in its own module, the main file is a thin shell, StrictMode is back on with no duplicate writes, and the app behaves exactly as before.

---

## Phase 9 — White-label: support multiple customers with their own branding

**Goal:** Let you onboard other companies — each with their own logo, colors, and name — safely isolated from each other.

**Why last among features:** It depends on almost everything before it. Theming needs the token kit (Phase 4) and the redesign (Phase 7). Safe data separation between customers is **impossible** until real logins and database rules exist (Phase 2). And it's cleanest once the app is modular (Phase 8).

**Work:**
- Pull the brand text, logo, and font choices into a theme config, and make the Logo render an uploaded image when present (falling back to your built-in paintbrush mark).
- Add a `tenants` table (brand name, tagline, logo URL, colors, fonts) and a theme loader that applies the right brand at startup.
- Add a logo-upload control in Admin (reusing the existing image-upload code) into a per-customer storage folder.
- Add a "New Client" onboarding screen with color pickers, logo upload, and a live preview.
- Add a `tenant_id` to every data table, backfill existing rows to your "Masterpiece" tenant, and stamp it on every new record.
- **Extend the database security rules (Phase 2) to enforce tenant isolation** so one customer can never see another's data. **This must land before a second real customer is added.**

**Depends on:** Phases 2, 4, 7, 8.

**Effort:** XL

**Agent builds it; you judge the theming UX** and confirm a test second-tenant truly can't see the first tenant's data.

**Done when:** You can create a second customer with their own logo/colors/name, that customer sees only their own data, and your default "Masterpiece" brand still renders pixel-identical.

> ⚠️ **Hard rule:** Do not put a second *real* paying customer's live data in the database until tenant isolation is proven. Until then, demo/staging only.

---

## Phase 10 — Privacy policy & terms (legal, gated at signup)

**Goal:** Cover the legal basics you asked for, because the app stores precise location history and financial receipts.

**Why here:** It depends on real accounts existing (Phase 2) so acceptance can be recorded per user, and it should be in place before onboarding outside customers (Phase 9). It can be drafted in parallel earlier, but it *ships* around here.

**Work:**
- Draft and publish a Privacy Policy and Terms & Conditions covering: who controls the data, that precise trip locations and receipt/financial data are stored, the third-party services that receive addresses (the geocoders), and users' deletion rights.
- Require acceptance at signup and record it.
- Build the data-retention and account-deletion paths that back up what the policy promises (delete account, purge receipts and cached locations).

**Depends on:** Phase 2 (real accounts to attach acceptance to).

**Effort:** M

**Needs your input** on the actual policy content (and ideally a lawyer's review — the agent can draft, not give legal advice).

**Done when:** New users must accept the policy before using the app, acceptance is recorded, and there's a working "delete my account and data" path.

---

## Cross-cutting dependencies (the wiring between phases)

- **Tests (Phase 0) underpin every refactor.** Without them, Phases 3–8 are flying blind on the money math.
- **The token kit (Phase 4) is the single hinge** for both the redesign (Phase 7) and white-label theming (Phase 9). Doing the inline-style migration *twice* (once for redesign, once for theming) would be wasteful and bug-prone — do it once, here.
- **Security (Phase 2) gates all multi-customer work (Phase 9).** Visual theming can happen without it, but *data isolation between customers* cannot.
- **Real login + database rules must change together (within Phase 2).** Fixing the rules without real logins locks everyone out, because the database currently has no idea who anyone is.
- **The engines extraction (Phase 3) feeds the two self-contained feature phases** — accuracy (5) and receipts→reports (6) — by giving them clean geocoding/routing/reporting code to build on.
- **The ~235 inline styles are touched by Phases 4, 7, and 9.** Keeping these sequenced (tokens → redesign → theming) avoids three teams editing the same styles in conflicting ways.

---

## Top risks (and how this plan manages them)

1. **Big-bang rewrite temptation.** With a non-technical owner driving an AI agent, the biggest danger is "let's just rebuild it all at once." That breaks the working app with no easy undo. *Mitigation:* every phase is shippable and reversible; engines and screens move one at a time.
2. **The security hole is live right now.** Anyone can read PINs and all data and self-promote to admin. *Mitigation:* Phase 2 is early and hard-gates customer #2. Until it's done, no second customer's real data goes in.
3. **The edit-trip mileage bug is already producing wrong dollars.** Edited trips silently keep stale mileage. *Mitigation:* fixed in Phase 1, hour one — but be aware the fix will *change* some existing numbers to the correct values.
4. **Half-finished theming looks broken.** Your brand is woven through the layout (login stripe, nav accent, logo, focus styles), not in one spot. A partial token migration yields a half-themed, broken-looking UI per tenant. *Mitigation:* Phase 4 migrates screen-by-screen with visual checks; theming (Phase 9) only happens after tokens are complete.
5. **The auth migration can lock users out if rushed.** *Mitigation:* do Phase 2 against a staging database copy, and you personally test logging in as yourself and a test employee before cutover.
6. **Changing the mileage stack shifts historical vs. new numbers.** New routing/geocoding can produce slightly different miles than old cached values. *Mitigation:* Phase 5 adds a source tag and a recompute/flag path so reports stay explainable rather than silently inconsistent.
7. **Premium effects can hurt cheap phones and printed reports.** Heavy blur/glow/shadows tax low-end devices and waste ink in printouts. *Mitigation:* Phase 7 tests on a real phone and explicitly neutralizes effects for print.
8. **Over-engineering the token/module system.** A too-clever architecture becomes unmaintainable for a solo non-technical owner. *Mitigation:* the scales and layers in Phases 4 and 8 are deliberately minimal; resist adding "just one more" size or layer.

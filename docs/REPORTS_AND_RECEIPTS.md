# Reports & Receipts Subsystem — Audit and Plan

*Lens: reports + receipts. Source of truth: `src/App.jsx` (~3,195 lines, single component). Schema cross-checked against the live Supabase project `lvhqfslhcpiwshgvrnlp`.*

---

## 1. Executive Summary

Receipts and reports both live inside the one giant `App.jsx` component. Receipts capture an **amount + date + optional note + optional photo**, store the photo in a **public Supabase Storage bucket** (`receipts`), and write a row to `public.receipts`. The admin-only **Reports** tab already does *more* receipt integration than the owner believes: it computes per-period receipt totals and renders a per-employee **"Total Owed = mileage reimbursement + receipts"** box, and the CSV export already appends a RECEIPTS section.

So the owner's statement "receipt data is not flowing into reports" is **partially true**. The real gaps are: the **headline summary card** ignores receipts; receipts **disappear when the Rejected toggle is on**; the **emailed report drops receipts entirely**; there are **no per-receipt line items, no images/links, and no category breakdown** in the report body; and there is **no category field** in the data model to break down by.

This document specifies exactly what exists, where, and a concrete data + UI plan to finish the merge.

---

## 2. How Receipts Work Today

### 2.1 Data model (verified live)

`public.receipts` columns:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (pk) | `gen_random_uuid()` |
| `user_id` | uuid (nullable) | who the receipt belongs to |
| `user_name` | text (not null) | denormalized name |
| `receipt_date` | date (not null) | |
| `amount` | numeric (default 0, not null) | dollar amount |
| `image_url` | text (nullable) | public Storage URL |
| `note` | text (nullable) | freeform |
| `status` | text (default `'logged'`) | **exists in DB but NEVER read/written by the app** |
| `created_at` | timestamptz (default `now()`) | |

**There is no `vendor` column and no `category` column.** The table is currently **empty (0 rows)**.

> The generic `public.categories` table (`id`, `name`, `sort_order`) is unrelated — it serves the materials/inventory features and has no link to receipts.

### 2.2 Capture flow

- State block: `App.jsx:544-554` (`receipts`, `rcMod`, `rcAmt`, `rcDate`, `rcNote`, `rcFile`, `rcPreview`, `rcUp`, `rcForUser`, `editRc`, `delRcMod`).
- `saveReceipt` — `App.jsx:776-824`. The **only required field is amount** (`disabled={!rcAmt}` at `App.jsx:3162`; validated `>0` at `App.jsx:777-780`). Photo is optional.
- Admins can log a receipt **for another user** via `rcForUser`; the note is auto-suffixed `(logged by X)` at `App.jsx:803`.
- Fields written: `user_id`, `user_name`, `receipt_date`, `amount`, `image_url`, `note`. `status` is not sent, so the DB default `'logged'` applies.
- Edit: `openEditReceipt` (`App.jsx:826-835`) → PATCH `receipts?id=eq.{id}` (`App.jsx:806`). Delete: `deleteReceipt` (`App.jsx:837+`) → DELETE.

### 2.3 Image storage

- `compressImg` (`App.jsx:747-768`) resizes to max **1200px** and encodes **JPEG quality 0.8**.
- Upload is a **raw `fetch`** to Supabase Storage: `POST ${SB}/storage/v1/object/receipts/${tgt.id}/${Date.now()}.jpg` (`App.jsx:788-793`).
- Stored URL is the **public** form `${SB}/storage/v1/object/public/receipts/${path}` (`App.jsx:795`).
- **Security note:** the bucket is public and the app authenticates with the anon key only — any receipt image URL is world-readable. This will matter for the white-label / multi-customer direction.

### 2.4 Receipts tab UI

- Rendered at `App.jsx:1824-1889`, gated `tab === "receipts"`.
- Lists **only the current user's own receipts**: `myReceipts = receipts.filter(r => r.user_id === user?.id)` (`App.jsx:1154`).
- Each row: thumbnail (click → open full image in new tab), amount (green), date + note, Edit, Delete. No vendor, no category, no status shown.
- Modal: `App.jsx:3100-3165` (Receipt For [admin only], Photo via Camera/Gallery, Amount, Date, Note).

---

## 3. How Reports Work Today

### 3.1 Access & screen

- **Admin-only**: `{tab === "reports" && isA && (...)}` at `App.jsx:2155`. `isA = role >= 2` (`App.jsx:561`). Regular users have **no reports screen**.

### 3.2 Filters

- `reportUser` (all / one employee) and `reportPeriod` (current pay period / monthly / ytd / all) — state at `App.jsx:512-513`, controls at `App.jsx:2168-2216`. A pay-period offset picker appears for "current" (`App.jsx:2195-2207`).

### 3.3 Derived data

- `reportTrips` filtered by user + period, split active vs rejected by `status` (`App.jsx:1090-1113`).
- `reportMiles`, `reportReimb`, and per-user `userTotals` `{miles, reimb, count}` (`App.jsx:1118-1130`).
- **Receipts already derived for reports:** `inReportPeriod` (`App.jsx:1132-1142`) → `reportReceipts` (`App.jsx:1143-1146`) → `userReceiptTotals` `{amount, count}` (`App.jsx:1147-1153`).

### 3.4 What is rendered

- **Headline summary card** (`App.jsx:2217-2269`): Total Miles + Reimbursement + trip count. **Receipts not shown here.**
- **Trip cards** (`App.jsx:2305-2498`), grouped by employee with user/month separators.
- **Per-employee "Total Owed" box** (`App.jsx:2427-2474`): shows trips/miles + reimbursement, and **if** the employee has receipts and the Rejected view is off, adds a receipts line and a combined `grand = reimb + receipt amount` labelled **"Total Owed"**. *This is the receipt→report merge that already exists.*

### 3.5 Output formats

| Output | Where | Receipts included? |
|---|---|---|
| **CSV download** (Blob + anchor, `mileage-report-${today}.csv`) | `exportCSV` `App.jsx:1156-1207` | **Yes** — appends a `RECEIPTS` section (`App.jsx:1181-1197`) when not in Rejected view |
| **Print** (`window.print()`, `@media print` hides nav/buttons/`.no-print`) | `App.jsx:1209-1211`, CSS `App.jsx:1260` | Whatever is on screen (no receipt line items exist on screen) |
| **Email** (`mailto:` with CSV pasted into the body — no Resend/SMTP, no attachment) | `emailReport` `App.jsx:1213-1258` | **No** — rebuilds CSV from trips only |

There is **no PDF generation** and **no report share-link**. (The "Share App" modal at `App.jsx:3080` shares the app URL via SMS, unrelated to reports.)

---

## 4. The Gap (precisely)

| # | Gap | Evidence |
|---|---|---|
| 1 | Headline summary card ignores receipts | `App.jsx:2217-2269` |
| 2 | Receipts vanish when Rejected toggle is on (`hasRc` requires `!showRejected`) | `App.jsx:2429` |
| 3 | Emailed report omits receipts entirely | `App.jsx:1218-1248` |
| 4 | No per-receipt line items in on-screen / print body | `App.jsx:2305-2498` |
| 5 | No category dimension → no category breakdown possible | schema has no `category` column |
| 6 | Receipt images never surfaced in any report output | image only in Receipts tab |
| 7 | CSV vs Email build divergent, inconsistent CSVs | `App.jsx:1156-1207` vs `1218-1242` |
| 8 | Receipt `status` column unused (no approve/reject lifecycle) | never referenced in code |

---

## 5. The Plan

### 5.1 Data layer

1. **Add `category` to `receipts`** (text; default `'Other'`). Optionally add `vendor` (text). Migration:
   ```sql
   ALTER TABLE public.receipts ADD COLUMN category text DEFAULT 'Other';
   ALTER TABLE public.receipts ADD COLUMN vendor text;
   ```
2. **Categories list:** ship a small constant array in code first (`['Fuel','Materials','Lodging','Meals','Tools','Other']`); later promote to a config/theme table for white-label.
3. **Decide on receipt `status`:** either (a) wire receipts into the same approve/reject lifecycle as trips (use the existing column), or (b) explicitly ignore it. Recommendation: mirror trips — adds parity and lets reports exclude unapproved receipts.

### 5.2 Single source of truth for report aggregation

Create one `buildReport()` helper returning `{ trips, receipts, perUser, totals }` where:
- `totals = { miles, mileageReimb, receiptTotal, grandTotal, byCategory }`
- `byCategory` = `{ [category]: { amount, count } }` over `reportReceipts`.

Feed **CSV, email, print, and on-screen** from this one object so they never diverge again (fixes Gap 7).

### 5.3 UI changes (report tab)

1. **Headline card (`App.jsx:2217-2269`):** add a third stat "Receipts $X (n)" and a combined "Total Owed $Y" = `reportReimb + receiptTotal` (fixes Gap 1).
2. **Category breakdown block:** a compact list under the headline — one row per category with amount + count + % of receipt total (fixes Gap 5).
3. **Per-employee receipt line items:** under each employee's "Total Owed" box, render that employee's receipts as small rows (date · category · note · amount · thumbnail/link). Use `reportReceipts.filter(r => r.user_name === t.user_name)`. Print-friendly (fixes Gaps 4 & 6).
4. **Rejected toggle:** decouple receipts from `showRejected`. Either always show receipts, or — if receipt status is added — show approved receipts in Active view and a receipts-pending list separately (fixes Gap 2).

### 5.4 Output changes

- **CSV:** add `Category` and `Vendor` columns to the RECEIPTS section; add a category-subtotals block.
- **Email (`App.jsx:1213-1258`):** replace its private CSV builder with the shared `buildReport()` CSV (the one `exportCSV` uses) and add receipt total + category subtotals to the body text (fixes Gap 3).
- **Images in outputs:** include `image_url` as a clickable link column in CSV; render thumbnails (or links) in the print view.
- **Future:** real PDF export and a Resend-emailed report (queued feature) should consume the same `buildReport()` object.

### 5.5 Modular extraction (aligns with owner's branches/engines/modules goal)

When the monolith is split, lift this subsystem into a **`reports` module** with: `useReports()` (data), `ReportSummary`, `ReceiptBreakdown`, `EmployeeTotals`, and an `exporters/` engine (`toCSV`, `toEmail`, `toPrint`, future `toPDF`) — all driven by one `buildReport()` selector.

---

## 6. Risks & Watch-outs

- **Public receipt bucket** is a privacy hole for multi-customer white-label; tighten before onboarding outside customers.
- **Adding `category`** to old rows yields `'Other'` defaults — acceptable, table is empty today.
- **mailto: body length** can exceed client limits with large CSVs; real email (Resend) is the proper fix.
- Two divergent CSV builders must be unified or they will drift again.

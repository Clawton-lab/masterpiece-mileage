# Masterpiece Mileage — White-Label Architecture

> Lens: **White-Label / Multi-Tenant SaaS**
> Source of truth: `src/App.jsx` (~3,195 lines). Live schema verified via Supabase MCP (project `lvhqfslhcpiwshgvrnlp`).
> This document **depends on** the design-token system specified by the redesign lens. Where it says "tokens," assume that system exists.

---

## 1. Where we are today (grounded in the code)

The app is structurally single-tenant and the brand is hardcoded in three layers. There is no theming abstraction to build on yet.

### 1.1 Colors are a frozen module-level object

```js
// App.jsx:172-191
const P = {
  bg: "#faf8f5", card: "#fff", bdr: "#e5e0d8", ...
  red: "#c41e2a",      // primary brand
  tan: "#c4b59a",      // secondary/accent
  blk: "#1a1a1a", ...
};
```

`P` is imported by reference into roughly 235 inline styles. There is **no CSS-variable layer** — `color: P.red` is evaluated at render and baked into the DOM. Changing a brand color today means editing this object and redeploying.

### 1.2 Fonts are a frozen object + a hardcoded `@import`

```js
// App.jsx:193-197
const Ft = { h: "'Bitter',serif", b: "'Source Sans 3',sans-serif", m: "'IBM Plex Mono',monospace" };
```

The font files are pulled in by a hardcoded Google Fonts `@import` inside the `css` template literal (App.jsx:1260), which **also** hardcodes a brand-coupled rule `input:focus{border-color:${P.red}}`. Brand bleeds even into focus styling.

### 1.3 The logo and brand name are baked into JSX

```jsx
// App.jsx:212-274 — Logo()
<svg ...>{/* three hand-coded brushstroke paths, colored with P.tan / P.red / P.blk */}</svg>
<div>Masterpiece</div>            // App.jsx:257
<div>Mileage Tracker</div>        // App.jsx:269
```

There is **no `<img>` / logo-URL code path anywhere in the app.** A customer cannot supply their own logo without editing the component. A second brand string, `"Outdoor Living — Mileage Tracker"`, is hardcoded on the login subtitle (App.jsx:1295). The login screen also renders a three-bar brand stripe in tan/red/black (App.jsx:1286-1288), and the bottom `Nav` uses `borderTop: 2px solid ${P.tan}` with active color `P.red` (App.jsx:451, 470-472) — brand is woven through layout, not isolated to one constant.

### 1.4 The database has no tenant concept (verified live)

All 13 public tables (`yard_users`, `trips`, `receipts`, `projects`, `mileage_settings`, `materials`, `transactions`, `tools`, `tool_checkouts`, `route_distances`, `categories`, `hanger_reference`, `urgent_reports`) are **flat and global**. None has a `tenant_id`/`org_id`/`company_id` column. Two customers in this database today would share one pool of trips, receipts, projects, and users.

`mileage_settings` is a **single global row** (live: 1 row), already loaded via `mileage_settings?limit=1` (App.jsx:569) and PATCHed by id (App.jsx:870). It is the natural seed for per-tenant config.

### 1.5 What already works in our favor

- **Supabase Storage is already wired** via raw fetch. Receipts upload to `${SB}/storage/v1/object/receipts/${path}` and read back `${SB}/storage/v1/object/public/receipts/${path}` (App.jsx:789-795), keyed by `${tgt.id}/${Date.now()}.jpg` (App.jsx:788). **Logo upload is a copy-paste of this pattern** into a new bucket.
- **The settings load/save plumbing exists** — extending it for brand fields is incremental, not greenfield.

### 1.6 The hard constraint: security must come first

Auth is PIN-based: the client fetches **all** active users with the public anon key (hardcoded at App.jsx:3-4) and matches name+PIN in JavaScript (App.jsx:607-609). There is no JWT, no session, and therefore **no server-side "which tenant am I."** The Supabase advisor additionally flags two tables with RLS fully disabled, and the rest are reached permissively with the anon key.

**Consequence:** real per-tenant data isolation is impossible until the security/RLS lens lands. White-label can deliver *visual* theming first (safe, single customer), but must not co-mingle a second customer's real data into this database until tenant-scoped RLS exists.

---

## 2. Target architecture

### 2.1 Theme config schema

A theme is data, not code. Minimum viable shape (a superset of today's `P`, `Ft`, and `Logo`):

```jsonc
{
  "tenant_id": "uuid",
  "slug": "masterpiece",            // resolves theme at runtime
  "brand_name": "Masterpiece",      // replaces App.jsx:257
  "brand_tagline": "Mileage Tracker", // replaces App.jsx:269 / 1295
  "logo_url": "https://.../tenant-logos/<id>/logo.png", // null => fallback SVG
  "logo_dark_url": null,
  "colors": {
    "primary":   "#c41e2a",   // P.red
    "accent":    "#c4b59a",   // P.tan
    "ink":       "#1a1a1a",   // P.blk / P.txt
    "bg":        "#faf8f5",   // P.bg
    "card":      "#ffffff",
    "border":    "#e5e0d8",
    "success":   "#16a34a",
    "warning":   "#d97706",
    "info":      "#2563eb"
  },
  "fonts": {
    "heading": "'Bitter',serif",
    "body":    "'Source Sans 3',sans-serif",
    "mono":    "'IBM Plex Mono',monospace",
    "google_import_families": ["Bitter:wght@400;600;700", "Source+Sans+3:..."]
  },
  "active": true
}
```

Every field maps one-to-one to something already hardcoded today, which is what keeps this low-risk: it is extraction, not invention.

### 2.2 Where it lives

| Phase | Storage | Why |
|---|---|---|
| 1 | A `themes.js` config object in the repo, one default export | No DB/schema change; instantly de-hardcodes the brand |
| 2 | New `tenants` table (or new columns on `mileage_settings`) | A non-technical owner can edit colors/name without a deploy |
| 3 | `tenants` table + `tenant-logos` Storage bucket | Self-serve uploads |

Recommended `tenants` table (DDL for the agent to apply, **after** the RLS lens):

```sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand_name text not null,
  brand_tagline text default '',
  logo_url text,
  colors jsonb not null default '{}'::jsonb,
  fonts  jsonb not null default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);
-- then add tenant_id uuid references public.tenants(id) to
-- yard_users, projects, trips, receipts, mileage_settings, ...
```

Using `jsonb` for `colors`/`fonts` lets the token set grow without migrations.

### 2.3 Runtime theme selection + application via CSS variables

This is the pivotal refactor and it **depends on the design-token system**. Today `P.red` is read directly; the token system must instead emit `var(--color-primary)`.

1. **Resolve the tenant** (in priority order, pragmatic for a small operator):
   - Phase 1: the single default theme.
   - Phase 2: by hostname/subdomain (`acme.app.com` → `slug=acme`) or a `?tenant=` query param, with localStorage cache.
   - Phase 3: from the authenticated user's `tenant_id` once auth carries it (security lens).
2. **Load** the theme object (config in P1; `GET tenants?slug=eq.<slug>` in P2/P3).
3. **Inject CSS variables** once at the app root:
   ```js
   const root = document.documentElement;
   Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(`--color-${k}`, v));
   ```
4. **Inject the font `@import`** dynamically instead of the hardcoded line at App.jsx:1260.
5. The `Logo()` component (App.jsx:212-274) becomes: render `<img src={theme.logo_url}>` if present, else fall back to the existing inline SVG (now colored with CSS vars) — preserving the brand for the default tenant exactly.

Note: a global theme provider/context will be far cleaner once the monolith is broken up (architecture lens); until then a single `useTheme()` hook at the top of `App()` is acceptable.

### 2.4 Logo upload & storage (reuse the receipt pattern)

Create a public `tenant-logos` bucket and reuse App.jsx:789-795 verbatim, swapping the path to `${tenantId}/logo.png`:

```js
await fetch(`${SB}/storage/v1/object/tenant-logos/${tenantId}/logo.png`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/png" },
  body: file
});
// public URL:
`${SB}/storage/v1/object/public/tenant-logos/${tenantId}/logo.png`
```

Save the public URL into `tenants.logo_url`. The existing `compressImg()` helper (used at App.jsx:787) can be reused for raster logos; PNG/SVG should bypass aggressive JPEG compression to keep edges crisp.

### 2.5 Per-tenant data isolation (ties to security/RLS)

This is the part that **cannot** be faked. Phased:

1. Add `tenant_id` to every user-data table (trips, receipts, projects, yard_users, mileage_settings, materials, transactions, tools, tool_checkouts, route_distances).
2. Backfill all existing rows with the default Masterpiece tenant id.
3. Stamp `tenant_id` on every insert (App.jsx `logTrip`/`saveReceipt`/`saveProj` etc.).
4. **RLS policies that filter by the tenant claim in the JWT** — which requires the auth lens to issue a real session carrying `tenant_id`. Until then, isolation is "logical" (app filters by tenant) and **not secure**; do not host two real customers in one DB before this step.
5. Storage: per-tenant folder prefix + Storage RLS so tenant A cannot fetch tenant B's logo path (logos are low-sensitivity; receipts are not).

### 2.6 "White glove" onboarding flow (for a solo operator)

Goal: stand up a branded client in minutes, owner-driven, voice/click friendly.

**Phase 2 (operator-assisted, recommended first real version):**
1. Owner opens an Admin → "New Client" screen.
2. Types brand name + tagline, picks primary/accent colors (color pickers), uploads a logo (reuses 2.4).
3. App `INSERT`s a `tenants` row and provisions a default `mileage_settings` row scoped to it.
4. App shows a live preview (the theme applied to a sample header/nav/button) before save — cheap because CSS variables update instantly.
5. Owner shares the tenant URL (`slug.app.com`) and creates the client's first admin user.

**Phase 3 (self-serve):** the same form, exposed to a tenant admin, scoped so they can only edit their own `tenants` row (RLS).

---

## 3. Phased roadmap

| Phase | Outcome | Depends on |
|---|---|---|
| **0** | Extract `P`, `Ft`, brand strings, and the logo into a single `theme` object + `useTheme()`; render via CSS variables. One hardcoded default theme — pixel-identical to today. | Design-token system |
| **1** | `tenants` table + admin form to edit colors/name/tagline without redeploy; live preview. | Phase 0 |
| **2** | `tenant-logos` Storage bucket + logo upload (reuse receipt pattern); logo URL drives the header. | Phase 1 |
| **3** | `tenant_id` columns + backfill + tenant-scoped RLS; runtime tenant resolution from auth. **True isolation.** | **Security/RLS + auth lens** |
| **4** | Self-serve white-glove onboarding for tenant admins. | Phase 3 |

---

## 4. Risks & gotchas

- **Do not ship multi-tenant data isolation before the security lens.** The app runs entirely on the public anon key (App.jsx:3-4) with client-side PIN matching (App.jsx:607-609); putting a second real customer in this DB today exposes both customers' data.
- **The brand is more diffuse than one constant.** Tan/red/black appear in the login stripe (App.jsx:1286-1288), the Nav accent (App.jsx:451, 470-472), and the logo strokes — every one must move to tokens or the theme will be half-applied.
- **~235 inline styles** read `P.*` directly; the token migration is mechanical but broad. Sequence it with the redesign lens so the work happens once.
- **SVG-logo color theming**: keeping the default brushstroke logo on tokens (so it recolors per theme) is nice, but uploaded raster logos won't recolor — fine, but the fallback path must be explicit.
- **Storage is currently a public bucket with the anon key in the header** — acceptable for logos (low sensitivity), but note it inherits the same lax posture as receipts; revisit under the security lens.
# Masterpiece Mileage — Brand & Design System

> Source of truth for the visual identity. Part 1 documents the brand **as it exists today** (reverse-engineered from `src/App.jsx`) so it is preserved. Part 2 defines the **elevation**: a token system, a hyperrealistic premium visual language, and component states that take the execution from drab to award-winning **without changing the identity**.

---

## Part 1 — The Brand As It Is Today (preserve this)

### 1.1 Name, tagline, voice
- **Product name:** *Masterpiece* / *Masterpiece Mileage* (logo wordmark `App.jsx:257`; HTML title `index.html:8`).
- **Sub-label:** "Mileage Tracker" in mono, red, uppercase (`App.jsx:259-269`).
- **Tagline:** "Outdoor Living — Mileage Tracker" (login, `App.jsx:1294-1296`).
- **Tone:** Craftsman / atelier. The metaphor is *the work trip as a brushstroke, the pay period as a finished painting.* Warm, premium, hand-made — not corporate-SaaS-blue. This is the single most important thing to protect.

### 1.2 The logo
An SVG mark (`App.jsx:212-273`): a white disc with a tan border holding **three paintbrush strokes** — a tan stroke, a red stroke, and a black stroke that resolves into the letter **"M"**. Paired with a two-line lockup: **Masterpiece** (Bitter 700, 15px) over **MILEAGE TRACKER** (Plex Mono, 8px, red, tracked +1.2).

> ⚠️ The current `public/favicon.svg` and `<meta name="theme-color" content="#0f172a">` (`index.html:7`) are **generic Vite-starter leftovers** (slate `#0f172a` + sky `#38bdf8`, a blue zig-zag). They do **not** match this brand and must be replaced with the paintbrush-M mark and brand colors.

### 1.3 Color (reverse-engineered from object `P`, `App.jsx:172-191`)

| Token (current) | Hex / value | Role |
|---|---|---|
| `bg` | `#faf8f5` | Cream "paper" canvas background |
| `card` | `#ffffff` | Card / surface |
| `bdr` | `#e5e0d8` | Default border (warm) |
| `bdrL` | `#f0ece6` | Light border / inset track |
| `txt` / `blk` | `#1a1a1a` | Ink — primary text & the "M" |
| `mid` | `#6b6560` | Secondary text (warm gray) |
| `lt` | `#9c9590` | Tertiary / muted text |
| `red` | `#c41e2a` | **Primary brand accent** (CTAs, active) |
| `rBg` | `rgba(196,30,42,0.06)` | Red tint background |
| `tan` | `#c4b59a` | **Canvas neutral** (brand secondary) |
| `tBg` | `rgba(196,181,154,0.12)` | Tan tint background |
| `grn` | `#16a34a` | Success / "calculated" / approved |
| `gBg` | `rgba(22,163,74,0.08)` | Success tint |
| `amb` | `#d97706` | Warning / "manual" / pending |
| `aBg` | `rgba(217,119,6,0.08)` | Warning tint |
| `blue` | `#2563eb` | Info (rare) |
| `bBg` | `rgba(37,99,235,0.06)` | Info tint |

**Brand triad:** cream + artist-red + ink, with tan as the warm connective tissue. Green/amber/blue are **status only**, never decoration.

### 1.4 The "paint stripe" motif
The defining graphic device: a three-band stripe **tan → red → black**, used as a 4px header rule (`App.jsx:1280-1289`), the header top-border (`borderTop:3px solid tan`, `App.jsx:1469`), and as colored left-borders that cycle across the three KPI tiles (`App.jsx:1559/1584/1609`). Treat this as a reusable brand element.

### 1.5 Typography (`Ft`, `App.jsx:193-197`; loaded `App.jsx:1260`)
- **Display / headings:** `Bitter`, serif — 400/600/700. Trip titles, totals, modal titles.
- **Body / UI:** `Source Sans 3`, sans — 400/500/600/700.
- **Labels / data / badges:** `IBM Plex Mono` — used uppercase with `letterSpacing ~1–1.2` for micro-labels, and for numeric data (miles, money, dates).

This three-font split (serif headline / humanist body / mono label) IS the typographic identity. Keep it.

### 1.6 Spacing, radius, elevation (as found)
- **Radii:** unscaled — 2/4/6/8/10/12/14/16/20 px. Inputs 10, cards 12–16, modal 20.
- **Elevation:** essentially none. Exactly **one** structural shadow exists (modal `0 -8px 40px rgba(0,0,0,0.15)`, `App.jsx:308`) plus one tiny toggle shadow (`App.jsx:1325`). Cards use a 1px border + a 3px colored accent edge instead of shadow.
- **Type sizes:** ad-hoc — 8–32px; report totals 28–32px Bitter; micro labels 8–11px mono.

### 1.7 Interaction & motion (as found)
- **Hover/focus:** ZERO hover states, ZERO focus-visible rings across 3,195 lines. Only a global `input:focus,select:focus{border-color:#c41e2a}` (`App.jsx:1260`).
- **Motion:** two keyframes only — `slideUp` (modal) and `fadeIn` (tab entrance, +12px), plus a Toast `transition:all .3s`. No reduced-motion guard.
- **Buttons:** the shared `Btn` (`App.jsx:374-400`) is a flat solid fill, no transition, no lift.

### 1.8 Do / Don't (preservation rules)
**Do:** keep cream paper, artist-red, ink, tan; keep Bitter/Source Sans/Plex Mono; keep the paintbrush-M and the paint-stripe; keep mono uppercase micro-labels; keep green/amber as *status-only*.
**Don't:** introduce SaaS blue/slate as a brand color; replace the serif headline with a sans; use pure `#000`/`#fff` page backgrounds (the warmth is the brand); add gradients that fight the matte-paper feel; let the generic blue favicon ship.

---

## Part 2 — The Elevation (award-winning, same identity)

### 2.0 Strategy
Replace ~235 scattered inline styles with a **CSS custom-property token system** plus a thin JS `theme` object, then layer a **hyperrealistic premium language**: real layered shadows, soft glassmorphism, **glowing hover lifts**, focus-visible rings, a proper type/space/radius scale, light **and** dark, and tasteful motion. Tokens are structured so a tenant can override a small surface for **white-label** (ties to the theming engine).

### 2.1 Token architecture (white-label ready)
Three layers. Tenants only ever override **Layer 1**.

```
Layer 1  --brand-*   primitive brand values  ← tenant override surface
Layer 2  --color-*/--space-*/--radius-*/...   semantic + scale tokens (reference Layer 1)
Layer 3  components consume Layer 2 only       (never hardcode hex)
```

```css
:root {
  /* ---- Layer 1: BRAND PRIMITIVES (the tenant override surface) ---- */
  --brand-accent:        #c41e2a;   /* Masterpiece red */
  --brand-accent-2:      #c4b59a;   /* canvas tan      */
  --brand-ink:           #1a1a1a;
  --brand-paper:         #faf8f5;
  --brand-logo-url:      url("/favicon.svg");
  --brand-font-display:  'Bitter', Georgia, serif;
  --brand-font-body:     'Source Sans 3', system-ui, sans-serif;
  --brand-font-mono:     'IBM Plex Mono', ui-monospace, monospace;

  /* ---- Layer 2: SEMANTIC COLOR ---- */
  --color-bg:            var(--brand-paper);
  --color-surface:       #ffffff;
  --color-surface-2:     #fbf9f6;          /* raised inner panel */
  --color-border:        #e5e0d8;
  --color-border-soft:   #f0ece6;
  --color-text:          var(--brand-ink);
  --color-text-mid:      #6b6560;
  --color-text-muted:    #9c9590;
  --color-accent:        var(--brand-accent);
  --color-accent-tint:   rgba(196,30,42,0.06);
  --color-accent-strong: #a5151f;          /* pressed */
  --color-accent-glow:   rgba(196,30,42,0.40);
  --color-neutral:       var(--brand-accent-2);
  --color-neutral-tint:  rgba(196,181,154,0.12);
  --color-success:#16a34a; --color-success-tint:rgba(22,163,74,0.08);
  --color-warning:#d97706; --color-warning-tint:rgba(217,119,6,0.08);
  --color-info:   #2563eb; --color-info-tint:   rgba(37,99,235,0.06);

  /* ---- Layer 2: TYPE SCALE (1.20 minor third) ---- */
  --text-2xs:10px; --text-xs:12px; --text-sm:14px; --text-md:16px;
  --text-lg:19px;  --text-xl:23px; --text-2xl:28px; --text-3xl:34px;
  --leading-tight:1.15; --leading-normal:1.45;
  --tracking-label:0.08em;          /* the mono micro-label look */

  /* ---- Layer 2: SPACE (4px base) ---- */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px;

  /* ---- Layer 2: RADIUS ---- */
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px;
  --radius-xl:20px; --radius-pill:999px;

  /* ---- Layer 2: ELEVATION (layered, warm-tinted shadows) ---- */
  --elev-1:0 1px 2px rgba(26,20,16,.06), 0 1px 1px rgba(26,20,16,.04);
  --elev-2:0 2px 4px rgba(26,20,16,.06), 0 4px 12px rgba(26,20,16,.06);
  --elev-3:0 8px 24px rgba(26,20,16,.10), 0 2px 6px rgba(26,20,16,.06);
  --elev-4:0 -8px 40px rgba(26,20,16,.15);   /* modal (preserved) */
  --glow-accent:0 0 0 1px var(--color-accent),
                0 6px 20px var(--color-accent-glow);

  /* ---- Layer 2: MOTION ---- */
  --ease-out:cubic-bezier(.16,1,.3,1);
  --ease-std:cubic-bezier(.4,0,.2,1);
  --dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms;
}
```

#### Dark mode
```css
:root[data-theme="dark"] {
  --color-bg:#15120f; --color-surface:#1e1a16; --color-surface-2:#241f1a;
  --color-border:#332c25; --color-border-soft:#2a241e;
  --color-text:#f4efe9; --color-text-mid:#bdb3a8; --color-text-muted:#8a8076;
  --color-accent:#e23b46; --color-accent-glow:rgba(226,59,70,.45);
  --elev-1:0 1px 2px rgba(0,0,0,.5);
  --elev-2:0 4px 12px rgba(0,0,0,.45);
  --elev-3:0 8px 28px rgba(0,0,0,.55);
}
```

#### Per-tenant override (white-label)
```css
:root[data-tenant="acme"] {
  --brand-accent:#0E7C66;
  --brand-accent-2:#D9C7A0;
  --brand-ink:#11201C;
  --brand-logo-url:url("/tenants/acme/logo.svg");
  --brand-font-display:'Fraunces', serif;
}
```
Because components only read Layer 2 (which reads Layer 1), a tenant swap is ~6 variables and a logo URL — no component edits.

### 2.2 The JS theme bridge (replaces `P` / `Ft`)
Keep `P` and `Ft` working during migration by pointing them at variables:
```js
export const T = {
  color:{ bg:'var(--color-bg)', surface:'var(--color-surface)',
          accent:'var(--color-accent)', text:'var(--color-text)', /* … */ },
  font:{ display:'var(--brand-font-display)', body:'var(--brand-font-body)',
         mono:'var(--brand-font-mono)' },
  space:n => `var(--space-${n})`,
  radius:k => `var(--radius-${k})`,
  elev:n => `var(--elev-${n})`,
};
// Back-compat shim so existing code keeps rendering mid-migration:
export const P = { bg:T.color.bg, red:T.color.accent, txt:T.color.text, /* … */ };
```

### 2.3 Component states (the award-winning layer)

#### Buttons — glow + lift + focus ring
```css
.btn{
  font:600 var(--text-sm)/1 var(--brand-font-body);
  display:inline-flex; gap:8px; align-items:center; justify-content:center;
  padding:12px 20px; border:none; border-radius:var(--radius-md);
  background:var(--color-accent); color:#fff; cursor:pointer;
  box-shadow:var(--elev-1);
  transition:transform var(--dur-fast) var(--ease-out),
             box-shadow var(--dur-base) var(--ease-out),
             background var(--dur-fast) var(--ease-std);
  will-change:transform;
}
.btn:hover{
  transform:translateY(-2px);
  box-shadow:var(--elev-2), var(--glow-accent);   /* the glow */
}
.btn:active{ transform:translateY(0); background:var(--color-accent-strong);
             box-shadow:var(--elev-1); }
.btn:focus-visible{ outline:none;
  box-shadow:0 0 0 3px var(--color-bg), 0 0 0 5px var(--color-accent); }
.btn[disabled]{ opacity:.4; cursor:default; transform:none; box-shadow:none; }
.btn--ghost{ background:var(--color-neutral-tint); color:var(--color-text-mid); }
.btn--ghost:hover{ box-shadow:var(--elev-1),
  0 0 0 1px var(--color-neutral); transform:translateY(-1px); }
@media (prefers-reduced-motion:reduce){
  .btn,.btn:hover,.btn:active{ transition:none; transform:none; }
}
```

#### Cards — depth + accent edge (keeps the stripe)
```css
.card{
  background:var(--color-surface); border:1px solid var(--color-border);
  border-radius:var(--radius-lg); padding:var(--space-5);
  box-shadow:var(--elev-1);
  transition:box-shadow var(--dur-base) var(--ease-out),
             transform var(--dur-base) var(--ease-out);
}
.card--interactive:hover{ box-shadow:var(--elev-3); transform:translateY(-2px); }
.card--accent{ border-top:3px solid var(--color-neutral); }   /* paint stripe */
.kpi--today{ border-left:3px solid var(--color-neutral); }
.kpi--period{ border-left:3px solid var(--color-accent); }
.kpi--ytd{ border-left:3px solid var(--color-ink, var(--color-text)); }
```

#### Inputs — focus glow (upgrades `iS`)
```css
.input{
  width:100%; padding:12px 14px; background:var(--color-surface);
  border:1.5px solid var(--color-border); border-radius:var(--radius-md);
  color:var(--color-text); font:var(--text-sm) var(--brand-font-body);
  transition:border-color var(--dur-fast) var(--ease-std),
             box-shadow var(--dur-fast) var(--ease-std);
}
.input:focus{ outline:none; border-color:var(--color-accent);
  box-shadow:0 0 0 4px var(--color-accent-tint); }
.input[aria-invalid="true"]{ border-color:var(--color-warning);
  box-shadow:0 0 0 4px var(--color-warning-tint); }
```

#### Glassmorphism (modal scrim + sticky nav)
```css
.scrim{ background:rgba(26,20,16,.40);
  backdrop-filter:blur(8px) saturate(1.1); }
.nav-glass{ background:color-mix(in srgb,var(--color-surface) 78%, transparent);
  backdrop-filter:blur(16px) saturate(1.2);
  border-top:2px solid var(--color-neutral); }
```

#### Badges / pills (formalize the tag pattern)
```css
.badge{ font:700 var(--text-2xs)/1 var(--brand-font-mono);
  text-transform:uppercase; letter-spacing:var(--tracking-label);
  padding:3px 8px; border-radius:var(--radius-pill); }
.badge--accent{ background:var(--color-accent-tint); color:var(--color-accent); }
.badge--ok{ background:var(--color-success-tint); color:var(--color-success); }
.badge--warn{ background:var(--color-warning-tint); color:var(--color-warning); }
```

### 2.4 Motion language
- Keep `fadeIn`/`slideUp`; retime with `var(--ease-out)`.
- Page/tab enter: `fadeIn var(--dur-slow) var(--ease-out)`.
- Hover lifts: `var(--dur-fast)`; shadow/glow: `var(--dur-base)`.
- **Always** wrap motion in `@media (prefers-reduced-motion:reduce)`.

### 2.5 Print
Keep `@media print` hiding nav/buttons (`App.jsx:1260`). In print, force `--color-bg:#fff`, drop all shadows/glows, and render the paint-stripe as a thin solid rule so reimbursement reports stay clean on paper.

### 2.6 Migration order (low-risk for a solo owner + AI agent)
1. Add `:root` token block to the `css` string; add the `T`/`P` shim — **no visual change yet**.
2. Swap `Btn`, `iS`, `Modal`, `Nav`, KPI tiles, badges to token-backed classes.
3. Introduce hover/focus/glow on `Btn` + cards (the visible "wow").
4. Replace favicon + `theme-color` with brand mark/colors.
5. Add `data-theme` dark toggle, then `data-tenant` override hook.

### 2.7 Quick Do / Don't (new work)
**Do:** consume Layer 2 tokens only; give every interactive element hover + `:focus-visible`; use layered warm shadows; gate motion on reduced-motion.
**Don't:** hardcode hex in components; use pure-black shadows (`rgba(0,0,0,…)`) — tint them warm; ship more than ~6 radius/size values outside the scale; let glow appear on disabled controls.
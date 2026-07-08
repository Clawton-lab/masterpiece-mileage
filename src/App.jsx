import { useState, useEffect, useCallback, useRef } from "react";
import { metersToMiles, reimbursement } from "./engines/money.js";
import { getPayPeriod } from "./engines/payPeriod.js";
import { fmtDate, fmtDateFull, today, thisYear } from "./engines/dates.js";
import { crowMiles, projCoords, isPlausibleDriving } from "./engines/geo.js";

// Supabase connection — configurable via env so we can point at a local copy
// for safe testing; falls back to production. (The anon key is public by
// design; real protection is the per-user login + Row-Level Security.)
const SB = import.meta.env.VITE_SUPABASE_URL || "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";

// ---- Session (real per-user auth token, persisted across reloads) ----
const SESSION_KEY = "mp_session";
let _session = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } })();
function setSession(s) {
  _session = s;
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {}
}
function getSession() { return _session; }

async function refreshSession() {
  if (!_session?.refresh_token) return false;
  try {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _session.refresh_token })
    });
    if (!r.ok) { setSession(null); return false; }
    const d = await r.json();
    setSession({ access_token: d.access_token, refresh_token: d.refresh_token });
    return true;
  } catch { return false; }
}

// Data calls now carry the logged-in user's token (not the shared key).
async function api(path, opts = {}, _retry = true) {
  const token = _session?.access_token || ANON;
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {})
    }
  });
  if (r.status === 401 && _retry && _session?.refresh_token) {
    if (await refreshSession()) return api(path, opts, false);
  }
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${txt}`);
  return txt ? JSON.parse(txt) : [];
}

// ---- Auth helpers (Supabase Auth: email + password) ----
async function authPassword(email, password) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error_description || d.msg || d.message || "Invalid email or password.");
  setSession({ access_token: d.access_token, refresh_token: d.refresh_token });
  return d.user;
}

async function authSignUp(email, password, name) {
  const r = await fetch(`${SB}/auth/v1/signup`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { name } })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error_description || d.msg || d.message || "Sign up failed.");
  if (d.access_token) setSession({ access_token: d.access_token, refresh_token: d.refresh_token });
  return d;
}

async function authGetUser() {
  if (!_session?.access_token) return null;
  try {
    const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${_session.access_token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function authSignOut() {
  try {
    if (_session?.access_token) {
      await fetch(`${SB}/auth/v1/logout`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${_session.access_token}` } });
    }
  } catch {}
  setSession(null);
}

async function authUpdatePassword(password) {
  const r = await fetch(`${SB}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: ANON, Authorization: `Bearer ${_session?.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error_description || d.msg || d.message || "Couldn't update password.");
  return d;
}

async function geocode(address) {
  console.log("Geocoding address:", address);
  
  try {
    await new Promise(r => setTimeout(r, 300));
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;
    console.log("Trying Photon API:", photonUrl);
    const photonRes = await fetch(photonUrl);
    const photonData = await photonRes.json();
    
    if (photonData.features && photonData.features.length > 0) {
      const coords = photonData.features[0].geometry.coordinates;
      console.log("Photon success:", coords);
      return { lat: coords[1], lng: coords[0] };
    }
    console.log("Photon failed, trying Nominatim...");
  } catch (e) {
    console.error("Photon error:", e);
  }
  
  try {
    await new Promise(r => setTimeout(r, 500));
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`;
    console.log("Trying Nominatim:", nomUrl);
    const nomRes = await fetch(nomUrl, {
      headers: { "User-Agent": "MasterpieceMileageApp/1.0" }
    });
    const nomData = await nomRes.json();
    
    if (nomData && nomData.length > 0) {
      console.log("Nominatim success:", nomData[0]);
      return { lat: parseFloat(nomData[0].lat), lng: parseFloat(nomData[0].lon) };
    }
    console.log("Nominatim failed");
  } catch (e) {
    console.error("Nominatim error:", e);
  }
  
  try {
    await new Promise(r => setTimeout(r, 300));
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&maxLocations=1&singleLine=${encodeURIComponent(address)}`;
    console.log("Trying ArcGIS:", arcUrl);
    const arcRes = await fetch(arcUrl);
    const arcData = await arcRes.json();
    if (arcData && arcData.candidates && arcData.candidates.length > 0) {
      const loc = arcData.candidates[0].location;
      console.log("ArcGIS success:", loc);
      return { lat: loc.y, lng: loc.x };
    }
    console.log("ArcGIS failed");
  } catch (e) {
    console.error("ArcGIS error:", e);
  }
  
  console.error("All geocoding services failed for:", address);
  return null;
}

// Optional fromProj/toProj are the full project objects. When they carry
// stored lat/lng we route with those directly instead of re-geocoding the
// address text — geocoders (Photon especially) can't always find a specific
// street address and silently snap to a town center, yielding an impossibly
// short drive (this is what put Cummings->Green at 5.8 mi instead of 18.2).
async function getDrivingMiles(from, to, fromProj, toProj) {
  const aStored = projCoords(fromProj);
  const bStored = projCoords(toProj);
  // Straight-line floor: a real driving route can never be shorter than this.
  // Null when either coordinate is unknown (then we can't judge plausibility).
  const floor = crowMiles(aStored, bStored);

  try {
    // Newest cached value wins, so a corrected entry supersedes an old bad one.
    const cached = await api(`route_distances?from_address=eq.${encodeURIComponent(from)}&to_address=eq.${encodeURIComponent(to)}&select=miles&order=verified_at.desc&limit=1`);
    if (cached && cached.length > 0) {
      const cm = Number(cached[0].miles);
      if (isPlausibleDriving(cm, floor)) {
        console.log("Cache hit:", from, "->", to, cm);
        return cm;
      }
      console.warn(`Ignoring impossible cached ${cm} mi (< straight-line ${floor?.toFixed(1)} mi) for ${from} -> ${to}; recomputing.`);
    }
  } catch (e) {
    console.error("Cache lookup error:", e);
  }
  try {
    const a = aStored || await geocode(from);
    if (!a) throw new Error(`Could not geocode: ${from}`);
    if (!aStored) await new Promise(r => setTimeout(r, 300));
    const b = bStored || await geocode(to);
    if (!b) throw new Error(`Could not geocode: ${to}`);
    await new Promise(r => setTimeout(r, 300));
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`
    );
    if (!r.ok) throw new Error(`Routing failed: ${r.status}`);
    const d = await r.json();
    if (d.code !== "Ok" || !d.routes || d.routes.length === 0)
      throw new Error(`No route found: ${d.code || "unknown error"}`);
    const miles = metersToMiles(d.routes[0].distance);
    // If the result is below the physical floor, a geocode went wrong — don't
    // save a bad (low) number; fall through to manual entry instead.
    if (!isPlausibleDriving(miles, floor)) {
      console.warn(`Route ${miles} mi below straight-line ${floor?.toFixed(1)} mi — treating as bad geocode.`);
      return null;
    }
    try {
      await api("route_distances", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ from_address: from, to_address: to, miles })
      });
    } catch (e) {
      console.error("Cache save error:", e);
    }
    return miles;
  } catch (e) {
    console.error("Mileage calculation error:", e);
    return null;
  }
}

// getPayPeriod, fmtDate, fmtDateFull, today, thisYear moved to src/engines/
// (payPeriod.js, dates.js) and are imported at the top of this file.

const ROLES = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RLBL = {
  super_admin: "Owner",
  senior_admin: "Senior Admin",
  admin: "Admin",
  user: "User"
};

const P = {
  // ── ORIGINAL KEYS (preserved; values elevated, warmer) ──
  bg:   "#f7f3ec",
  card: "#fffdfa",
  bdr:  "#e7ded0",
  bdrL: "#f1eae0",
  txt:  "#1a1512",
  mid:  "#6b6058",
  lt:   "#857b6e",
  red:  "#c41e2a",
  rBg:  "rgba(196,30,42,0.06)",
  tan:  "#c4b59a",
  tBg:  "rgba(196,181,154,0.14)",
  blk:  "#1a1512",
  grn:  "#1f7a45",
  gBg:  "rgba(31,122,69,0.09)",
  amb:  "#c2740a",
  aBg:  "rgba(194,116,10,0.10)",
  blue: "#2461c4",
  bBg:  "rgba(36,97,196,0.06)",

  // ── NEW: surface / ink tokens (additive) ──
  cardHi:    "#ffffff",
  paper2:    "#fbf7f0",
  ink2:      "#3a322c",
  redStrong: "#a5151f",
  redGlow:   "rgba(196,30,42,0.34)",
  tanDeep:   "#a8956f",
  gold:      "#b08d57",

  // charcoal "gallery wall" chrome (header only)
  onInk:     "#f4efe9",
  onInkMid:  "#bdb3a8",
  inkBdr:    "rgba(255,255,255,0.08)",
  redOnInk:  "#ff8a93",

  // ── NEW: gradients (paper-true, never neon) ──
  gRed:    "linear-gradient(165deg,#d8323d 0%,#c41e2a 52%,#a5151f 100%)",
  gTan:    "linear-gradient(165deg,#d4c6ab 0%,#c4b59a 100%)",
  gInk:    "linear-gradient(165deg,#2c2520 0%,#1a1512 100%)",
  gCard:   "linear-gradient(180deg,#fffefb 0%,#fdfaf4 100%)",
  gPaper:  "radial-gradient(115% 85% at 50% -10%,#fbf7f0 0%,#f7f3ec 46%,#f2ece1 100%)",
  gInkBar: "linear-gradient(180deg,#272019 0%,#1c1714 100%)",
  gStripe: "linear-gradient(90deg,#c4b59a 0 33.33%,#c41e2a 33.33% 66.66%,#1a1512 66.66% 100%)",

  // ── NEW: layered warm elevation (never pure black) ──
  sh1: "0 1px 2px rgba(58,42,28,.05), 0 1px 1px rgba(58,42,28,.04)",
  sh2: "0 1px 2px rgba(58,42,28,.05), 0 4px 14px rgba(58,42,28,.07)",
  sh3: "0 2px 6px rgba(58,42,28,.06), 0 14px 34px rgba(58,42,28,.12)",
  sh4: "0 -10px 48px rgba(40,28,18,.22), inset 0 1px 0 rgba(255,255,255,.85)",
  shInset:   "inset 0 1px 0 rgba(255,255,255,.7)",
  shField:   "inset 0 1px 2px rgba(58,42,28,.06)",
  shBar:     "0 6px 24px rgba(20,14,10,.28)",
  glow:      "0 0 0 1px rgba(196,30,42,.55), 0 8px 22px rgba(196,30,42,.30)",
  glowToast: "0 10px 30px rgba(196,30,42,.34), 0 2px 8px rgba(58,42,28,.18)"
};

const Ft = {
  h: "'Bitter',serif",
  b: "'Source Sans 3',sans-serif",
  m: "'IBM Plex Mono',monospace"
};

const iS = {
  width: "100%",
  padding: "12px 14px",
  background: "linear-gradient(180deg,#fffefb 0%,#fdfaf4 100%)",
  border: `1.5px solid ${P.bdr}`,
  borderRadius: 11,
  color: P.txt,
  fontSize: 15,
  fontFamily: Ft.b,
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(58,42,28,.06)",
  transition: "border-color .14s ease, box-shadow .16s ease"
};

function Logo({ dark }) {
  if (dark) {
    // Charcoal header: white M-mark + wordmark lockup
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <img
          src="/logo-mark-white.png"
          alt="Masterpiece"
          style={{
            height: 30,
            width: "auto",
            display: "block",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,.45))"
          }}
        />
        <div style={{ lineHeight: 1.05 }}>
          <div
            style={{
              fontFamily: Ft.h,
              fontSize: 15,
              fontWeight: 700,
              color: P.onInk,
              letterSpacing: "-.01em"
            }}
          >
            Masterpiece
          </div>
          <div
            style={{
              fontSize: 8,
              fontFamily: Ft.m,
              color: P.redOnInk,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase"
            }}
          >
            Mileage Tracker
          </div>
        </div>
      </div>
    );
  }
  // Light login: full color brand logo
  return (
    <img
      src="/logo-color.png"
      alt="Masterpiece Outdoor Living"
      style={{ height: 50, width: "auto", display: "block" }}
    />
  );
}

// A person's profile photo, or a colored initial when they haven't set one.
// Same treatment for every role — employee, admin, or owner.
function Avatar({ u, size = 30 }) {
  const initial = (u?.name || "?").trim().charAt(0).toUpperCase();
  const common = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,.25)"
  };
  if (u?.avatar_url) {
    return <img src={u.avatar_url} alt={u.name} style={{ ...common, objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        ...common,
        background: P.gRed,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 700,
        fontFamily: Ft.h
      }}
    >
      {initial}
    </div>
  );
}

function Modal({ open, onClose, title, children, accent }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
    >
      <div
        onClick={onClose}
        className="mp-scrim"
        style={{
          position: "absolute",
          inset: 0
        }}
      />
      <div
        className="mp-sheet"
        style={{
          position: "relative",
          background: P.gCard,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "20px 20px 32px",
          boxShadow: P.sh4,
          animation: "mpRise .34s cubic-bezier(.16,1,.3,1)"
        }}
      >
        {accent && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: P.gRed,
              borderRadius: "20px 20px 0 0"
            }}
          />
        )}
        <div
          style={{
            width: 44,
            height: 4,
            background: P.tan,
            borderRadius: 2,
            margin: "0 auto 16px"
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}
        >
          <h2 className="mp-display" style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: Ft.h }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="mp-focusable"
            style={{
              background: "none",
              border: "none",
              color: P.lt,
              cursor: "pointer",
              padding: 4,
              borderRadius: 8,
              fontSize: 20
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Fl({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: P.mid,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          marginBottom: 5,
          fontFamily: Ft.m
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Btn({ children, onClick, color = P.red, full, disabled, small, sx }) {
  const grad =
    color === P.red ? P.gRed :
    color === P.tan ? P.gTan :
    (color === P.blk || color === P.txt) ? P.gInk :
    color === P.grn ? "linear-gradient(165deg,#249a55 0%,#1f7a45 100%)" :
    color === P.amb ? "linear-gradient(165deg,#dd870f 0%,#c2740a 100%)" :
    null;
  // tan reads dark text for contrast; everything else is white-on-color
  const fg = color === P.tan ? P.txt : "#fff";
  return (
    <button
      className="mp-btn mp-focusable"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "true" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: small ? "9px 16px" : "13px 22px",
        borderRadius: 11,
        border: "none",
        background: grad || color,
        color: fg,
        fontSize: small ? 13 : 15,
        fontWeight: 700,
        letterSpacing: small ? ".01em" : ".005em",
        cursor: disabled ? "default" : "pointer",
        fontFamily: Ft.b,
        opacity: disabled ? 0.45 : 1,
        width: full ? "100%" : "auto",
        WebkitTapHighlightColor: "transparent",
        ...sx
      }}
    >
      {children}
    </button>
  );
}

function Toast({ m, s }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: `translateX(-50%) translateY(${s ? 0 : 20}px)`,
        background: P.gRed,
        color: "#fff",
        padding: "12px 22px",
        borderRadius: 12,
        boxShadow: P.glowToast,
        border: "1px solid rgba(255,255,255,.14)",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: Ft.b,
        opacity: s ? 1 : 0,
        transition: "all .3s",
        pointerEvents: "none",
        zIndex: 9999,
        maxWidth: "90%",
        textAlign: "center"
      }}
    >
      {m}
    </div>
  );
}

function Nav({ tab, set, admin }) {
  // Profile and Admin are intentionally not tabs here — both live behind
  // the name-menu dropdown in the header, so the bottom nav stays focused
  // on the core work tabs everyone uses every day.
  const ts = [
    { k: "log", l: "Log Trip" },
    { k: "receipts", l: "Receipts" },
    { k: "trips", l: "My Trips" },
    { k: "projects", l: "Projects" }
  ];
  if (admin) {
    ts.push({ k: "reports", l: "Reports" });
  }

  return (
    <nav
      className="mp-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        borderTop: `2px solid ${P.tan}`,
        display: "flex",
        gap: 4,
        padding: "10px 6px calc(10px + env(safe-area-inset-bottom, 0px))"
      }}
    >
      {ts.map(t => (
        <button
          key={t.k}
          onClick={() => set(t.k)}
          className="mp-tab"
          data-on={tab === t.k}
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "11px 2px",
            borderRadius: 13,
            background: tab === t.k ? P.gRed : "transparent",
            border: "none",
            cursor: "pointer",
            color: tab === t.k ? "#fff" : P.mid,
            boxShadow: tab === t.k ? "0 4px 12px rgba(196,30,42,.32)" : "none",
            fontSize: 10.5,
            fontWeight: 800,
            fontFamily: Ft.m,
            letterSpacing: ".01em"
          }}
        >
          <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.l}
          </span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  // One-time heads-up on the login screen explaining the PIN -> password
  // switch. Dismissal is remembered per-browser (there's no account context
  // yet at the login screen to track this per-person).
  const [showSetupNotice, setShowSetupNotice] = useState(() => {
    try { return localStorage.getItem("mp_setup_notice_dismissed") !== "1"; } catch { return true; }
  });
  const dismissSetupNotice = () => {
    setShowSetupNotice(false);
    try { localStorage.setItem("mp_setup_notice_dismissed", "1"); } catch {}
  };
  const [aName, setAN] = useState("");
  const [aPin, setAP] = useState("");
  const [aEmail, setAE] = useState("");
  const [aPass, setAPass] = useState("");
  const [pwMod, setPwMod] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [aErr, setAErr] = useState("");
  const [aSaving, setASaving] = useState(false);
  const [projs, setProjs] = useState([]);
  const [trips, setTrips] = useState([]);
  const [settings, setSettings] = useState({
    irs_rate: 0.70,
    pay_period_anchor: "2026-01-07",
    pay_period_frequency: "biweekly",
    pay_period_time: "12:00"
  });
  const [users, setUsr] = useState([]);
  const [tab, setTab] = useState("log");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [tripDate, setTripDate] = useState(today());
  const [calculating, setCalc] = useState(false);
  const [projMod, setProjMod] = useState(false);
  const [nPN, setNPN] = useState("");
  const [nPA, setNPA] = useState("");
  const [reportUser, setReportUser] = useState("all");
  const [reportPeriod, setReportPeriod] = useState("current");
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7));
  const [payPeriodOffset, setPayPeriodOffset] = useState(0);
  const [showRejected, setShowRejected] = useState(false);
  const [myShowRejected, setMyShowRejected] = useState(false);
  const [settingsRate, setSettingsRate] = useState("");
  const [settingsAnchor, setSettingsAnchor] = useState("");
  const [settingsFreq, setSettingsFreq] = useState("biweekly");
  const [settingsTime, setSettingsTime] = useState("12:00");
  const [toast, setToast] = useState({ m: "", s: false });
  const [loaded, setLoaded] = useState(false);
  const [adPg, setAdPg] = useState("hub");
  const [editUser, setEU] = useState(null);
  const [euN, setEUN] = useState("");
  const [euE, setEUE] = useState("");
  const [delUserMod, setDUM] = useState(null);
  const [delTripMod, setDTM] = useState(null);
  const [emailMod, setEmailMod] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [manualMod, setManualMod] = useState(false);
  const [manualMiles, setManualMiles] = useState("");
  const [editMod, setEditMod] = useState(false);
  const [editT, setET] = useState(null);
  const [edFr, setEdFr] = useState("");
  const [edTo, setEdTo] = useState("");
  const [edDt, setEdDt] = useState("");
  const [edNt, setEdNt] = useState("");
  const [shareMod, setShareMod] = useState(false);
  const [sharePhones, setSharePhones] = useState("");
  const [logForUser, setLogForUser] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [rcMod, setRcMod] = useState(false);
  const [rcAmt, setRcAmt] = useState("");
  const [rcDate, setRcDate] = useState(today());
  const [rcNote, setRcNote] = useState("");
  const [rcFile, setRcFile] = useState(null);
  const [rcPreview, setRcPreview] = useState("");
  const [rcUp, setRcUp] = useState(false);
  const [rcForUser, setRcForUser] = useState("");
  const [rcProj, setRcProj] = useState("");
  const [editRc, setEditRc] = useState(null);
  const [delRcMod, setDelRcMod] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sgType, setSgType] = useState("suggestion");
  const [sgMsg, setSgMsg] = useState("");
  const [sgSaving, setSgSaving] = useState(false);
  const [sgPopup, setSgPopup] = useState(null);
  const [sgPromptDone, setSgPromptDone] = useState(false);
  const [sgDetail, setSgDetail] = useState(null);
  const [avUploading, setAvUploading] = useState(false);
  // First-Time Setup: null = form; a string = "check your email" state,
  // holding the address we sent the confirmation link to.
  const [setupSentTo, setSetupSentTo] = useState(null);
  // Set when the app boots from a Supabase password-recovery email link —
  // shows the "set your real password" screen instead of the normal app.
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPw, setRecoveryPw] = useState("");
  const [recoveryPw2, setRecoveryPw2] = useState("");
  const [recoveryErr, setRecoveryErr] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);

  const show = useCallback(m => {
    setToast({ m, s: true });
    setTimeout(() => setToast(t => ({ ...t, s: false })), 2800);
  }, []);

  const isA = user && ROLES[user.role] >= 2;
  const isS = user && ROLES[user.role] >= 3;

  const load = useCallback(async () => {
    try {
      const [p, t, s, u, r, sg] = await Promise.all([
        api("projects?order=name"),
        api("trips?order=created_at.desc"),
        api("mileage_settings?limit=1"),
        api("yard_users?order=name"),
        api("receipts?order=receipt_date.desc"),
        api("suggestions?order=created_at.desc")
      ]);
      setProjs(p);
      setTrips(t.map(x => ({ ...x, trip_date: typeof x.trip_date === "string" ? x.trip_date.slice(0, 10) : x.trip_date })));
      setUsr(u);
      setReceipts(r.map(x => ({ ...x, receipt_date: typeof x.receipt_date === "string" ? x.receipt_date.slice(0, 10) : x.receipt_date })));
      setSuggestions(sg);
      if (s && s.length > 0) {
        setSettings(s[0]);
        setSettingsRate(s[0].irs_rate.toString());
        setSettingsAnchor(s[0].pay_period_anchor);
        setSettingsFreq(s[0].pay_period_frequency || "biweekly");
        setSettingsTime(s[0].pay_period_time || "12:00");
      }
    } catch (e) {
      console.error(e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [user, load]);

  // Once per login, if there's an uncleared suggestion/bug report and this
  // user is admin-tier, surface it as a heads-up popup. Latched by
  // sgPromptDone so it doesn't re-open every 15s poll refresh — after that,
  // clearing one explicitly chains to the next pending item (see clearSuggestion).
  useEffect(() => {
    if (!loaded || !isA || sgPromptDone) return;
    const pending = suggestions
      .filter(s => !s.cleared_at)
      .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    if (pending.length > 0) setSgPopup(pending[0]);
    setSgPromptDone(true);
  }, [loaded, isA, suggestions, sgPromptDone]);

  // Close the account dropdown on an outside click. A plain fixed-position
  // backdrop won't work here: the header has backdrop-filter (for the
  // frosted-glass look), which creates a new containing block for
  // position:fixed descendants, so a backdrop nested inside it only covers
  // the header's own box instead of the full screen.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  // Detect landing here from the emailed confirmation link. Supabase's
  // /auth/v1/verify redirects back with the session in the URL fragment
  // (#access_token=...&type=recovery&...) rather than a query string.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery") || !hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      setSession({ access_token, refresh_token });
      setRecoveryMode(true);
      // Scrub the tokens out of the URL/history so a page refresh (or
      // anyone glancing at the address bar) doesn't expose them.
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Restore an existing session on load (stay logged in across refreshes).
  useEffect(() => {
    (async () => {
      if (!getSession()?.access_token) return;
      const au = await authGetUser();
      if (!au) { setSession(null); return; }
      try {
        const prof = await api(`yard_users?id=eq.${au.id}&limit=1`);
        if (prof && prof[0] && prof[0].active !== false) setUser(prof[0]);
        else setSession(null);
      } catch { setSession(null); }
    })();
  }, []);

  const login = async () => {
    setAErr("");
    if (!aEmail.trim() || !aPass) {
      setAErr("Enter your email and password.");
      return;
    }
    try {
      const au = await authPassword(aEmail.trim().toLowerCase(), aPass);
      const prof = await api(`yard_users?id=eq.${au.id}&limit=1`);
      if (!prof || !prof[0]) { await authSignOut(); setAErr("No profile found for this account."); return; }
      if (prof[0].active === false) { await authSignOut(); setAErr("This account is deactivated."); return; }
      setUser(prof[0]);
      setAPass("");
      show(`Welcome back, ${prof[0].name}!`);
    } catch (e) {
      setAErr(e.message || "Login failed.");
    }
  };

  // First-Time Setup, step 1: verify the PIN, then Supabase emails a real,
  // clickable confirmation link (via the setup-account Edge Function —
  // needs the service role, so it can't happen in the browser). No password
  // yet here; they set that after they've actually clicked the link
  // (see the recovery-callback screen below).
  const setupAccount = async () => {
    setAErr("");
    const email = aEmail.trim().toLowerCase();
    if (!email || !/^\d{4}$/.test(aPin)) {
      setAErr("Enter your work email and your current 4-digit PIN.");
      return;
    }
    setASaving(true);
    try {
      const r = await fetch(`${SB}/functions/v1/setup-account`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin: aPin })
      }).then(res => res.json());
      if (!r || !r.ok) {
        setAErr((r && r.error) || "Setup failed. Double-check your email and PIN.");
        setASaving(false);
        return;
      }
      setSetupSentTo(email);
      setAP("");
    } catch (e) {
      setAErr("Setup failed. Please try again.");
    }
    setASaving(false);
  };

  const changePassword = async () => {
    setPwErr("");
    if (newPw.length < 8) { setPwErr("Password must be at least 8 characters."); return; }
    if (newPw !== newPw2) { setPwErr("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      await authUpdatePassword(newPw);
      setPwMod(false); setNewPw(""); setNewPw2("");
      show("Password updated ✓");
    } catch (e) {
      setPwErr(e.message || "Couldn't update password.");
    }
    setPwSaving(false);
  };

  // Step 2 of First-Time Setup: they clicked the real emailed link (proving
  // the inbox is theirs) and are here on a live recovery session. Setting
  // their password here is the actual account creation moment.
  const finishRecoverySetup = async () => {
    setRecoveryErr("");
    if (recoveryPw.length < 8) { setRecoveryErr("Password must be at least 8 characters."); return; }
    if (recoveryPw !== recoveryPw2) { setRecoveryErr("Passwords don't match."); return; }
    setRecoverySaving(true);
    try {
      await authUpdatePassword(recoveryPw);
      await api("rpc/mark_setup_complete", { method: "POST", body: "{}" });
      const au = await authGetUser();
      const prof = au ? await api(`yard_users?id=eq.${au.id}&limit=1`) : [];
      setRecoveryMode(false);
      setRecoveryPw(""); setRecoveryPw2("");
      if (prof && prof[0]) {
        setUser(prof[0]);
        show(`Welcome, ${prof[0].name}! Your account is all set.`);
      } else {
        setMode("login");
        show("Account set up — please log in.");
      }
    } catch (e) {
      setRecoveryErr(e.message || "Couldn't finish setup.");
    }
    setRecoverySaving(false);
  };

  const logTrip = async () => {
    if (!fromId || !toId || fromId === toId) {
      show("Select two different projects");
      return;
    }
    const fromP = projs.find(p => p.id === fromId);
    const toP = projs.find(p => p.id === toId);
    if (!fromP?.address || !toP?.address) {
      show("Both projects need addresses");
      return;
    }
    const tgt = (isA && logForUser) ? users.find(u => u.id === logForUser) : user;
    setCalc(true);
    try {
      let miles = await getDrivingMiles(fromP.address, toP.address, fromP, toP);
      if (!miles) {
        setCalc(false);
        setManualMod(true);
        return;
      }
      const reimb = reimbursement(miles, settings.irs_rate);
      await api("trips", {
        method: "POST",
        body: JSON.stringify({
          user_id: tgt.id,
          user_name: tgt.name,
          from_project_id: fromP.id,
          from_project_name: fromP.name,
          from_address: fromP.address,
          to_project_id: toP.id,
          to_project_name: toP.name,
          to_address: toP.address,
          miles,
          reimbursement: reimb,
          irs_rate: settings.irs_rate,
          note: (isA && logForUser && logForUser !== user.id) ? `${tripNote ? tripNote + " " : ""}(logged by ${user.name})`.trim() : tripNote,
          trip_date: tripDate
        })
      });
      await load();
      setFromId(toId);
      setToId("");
      setTripNote("");
      setTripDate(today());
      show(`${miles} mi logged for ${tgt.name} — $${reimb.toFixed(2)}`);
    } catch (e) {
      show("Error logging trip");
    }
    setCalc(false);
  };

  const saveManualTrip = async () => {
    const miles = parseFloat(manualMiles);
    if (!miles || miles <= 0) {
      show("Enter valid miles");
      return;
    }
    const fromP = projs.find(p => p.id === fromId);
    const toP = projs.find(p => p.id === toId);
    const tgt = (isA && logForUser) ? users.find(u => u.id === logForUser) : user;
    const reimb = reimbursement(miles, settings.irs_rate);
    try {
      await api("trips", {
        method: "POST",
        body: JSON.stringify({
          user_id: tgt.id,
          user_name: tgt.name,
          from_project_id: fromP.id,
          from_project_name: fromP.name,
          from_address: fromP.address,
          to_project_id: toP.id,
          to_project_name: toP.name,
          to_address: toP.address,
          miles,
          reimbursement: reimb,
          irs_rate: settings.irs_rate,
          note: (isA && logForUser && logForUser !== user.id) ? `${tripNote ? tripNote + " " : ""}(logged by ${user.name})`.trim() : tripNote,
          trip_date: tripDate
        })
      });
      await load();
      setFromId(toId);
      setToId("");
      setTripNote("");
      setTripDate(today());
      setManualMod(false);
      setManualMiles("");
      show(`${miles} mi logged for ${tgt.name} — $${reimb.toFixed(2)}`);
    } catch (e) {
      show("Error saving trip");
    }
  };

  const compressImg = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        let { width: w, height: h } = img;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(b => b ? resolve(b) : reject(new Error("compress failed")), "image/jpeg", 0.8);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const pickReceiptFile = f => {
    if (!f) return;
    setRcFile(f);
    setRcPreview(URL.createObjectURL(f));
  };

  // Every person manages their own profile photo — stored at
  // avatars/{their-user-id}/..., enforced by storage policy (can't write into
  // anyone else's folder). Same flow for every role.
  const uploadAvatar = async file => {
    if (!file) return;
    setAvUploading(true);
    try {
      const blob = await compressImg(file);
      const path = `${user.id}/${Date.now()}.jpg`;
      const token = getSession()?.access_token || ANON;
      const up = await fetch(`${SB}/storage/v1/object/avatars/${path}`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
        body: blob
      });
      if (!up.ok) throw new Error("upload failed");
      const avatarUrl = `${SB}/storage/v1/object/public/avatars/${path}`;
      await api(`yard_users?id=eq.${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: avatarUrl })
      });
      setUser(u => (u ? { ...u, avatar_url: avatarUrl } : u));
      await load();
      show("Profile picture updated");
    } catch (e) {
      show("Error updating profile picture");
    }
    setAvUploading(false);
  };

  const saveReceipt = async () => {
    const amt = parseFloat(rcAmt);
    if (!amt || amt <= 0) {
      show("Enter a valid amount");
      return;
    }
    const tgt = (isA && rcForUser) ? users.find(u => u.id === rcForUser) : user;
    const projSel = projs.find(p => p.id === rcProj);
    setRcUp(true);
    try {
      let imageUrl = editRc ? editRc.image_url : null;
      if (rcFile) {
        const blob = await compressImg(rcFile);
        const path = `${tgt.id}/${Date.now()}.jpg`;
        // Upload as the logged-in user (session token), not a shared key.
        const token = getSession()?.access_token || ANON;
        const up = await fetch(`${SB}/storage/v1/object/receipts/${path}`, {
          method: "POST",
          headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
          body: blob
        });
        if (!up.ok) throw new Error("upload failed");
        imageUrl = `${SB}/storage/v1/object/public/receipts/${path}`;
      }
      const body = {
        user_id: tgt.id,
        user_name: tgt.name,
        receipt_date: rcDate,
        amount: amt,
        image_url: imageUrl,
        project_id: rcProj || null,
        project_name: projSel?.name || "",
        note: (isA && rcForUser && rcForUser !== user.id) ? `${rcNote ? rcNote + " " : ""}(logged by ${user.name})`.trim() : rcNote
      };
      if (editRc) {
        await api(`receipts?id=eq.${editRc.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("receipts", { method: "POST", body: JSON.stringify(body) });
      }
      await load();
      setRcMod(false);
      setRcAmt("");
      setRcDate(today());
      setRcNote("");
      setRcFile(null);
      setRcPreview("");
      setRcForUser("");
      setRcProj("");
      setEditRc(null);
      show(editRc ? "Receipt updated" : `Receipt saved for ${tgt.name}`);
    } catch (e) {
      show("Error saving receipt");
    }
    setRcUp(false);
  };

  const openEditReceipt = r => {
    setEditRc(r);
    setRcAmt(String(r.amount));
    setRcDate(r.receipt_date);
    setRcNote(r.note || "");
    setRcForUser(isA ? r.user_id : "");
    setRcProj(r.project_id || "");
    setRcFile(null);
    setRcPreview(r.image_url || "");
    setRcMod(true);
  };

  const deleteReceipt = async id => {
    try {
      await api(`receipts?id=eq.${id}`, { method: "DELETE" });
      await load();
      setDelRcMod(null);
      show("Receipt deleted");
    } catch (e) {
      show("Error");
    }
  };

  // Printable reimbursement sheet: each receipt photo next to its details —
  // employee, amount, the project it's linked to, date, and note.
  const printReceipts = (list, label) => {
    if (!list || list.length === 0) { show("No receipts to print"); return; }
    const w = window.open("", "_blank");
    if (!w) { show("Allow pop-ups to print receipts"); return; }
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);
    const cards = list.map(r => `
      <div class="card">
        ${r.image_url ? `<img src="${esc(r.image_url)}" alt="receipt" />` : `<div class="ph">🧾</div>`}
        <div class="meta">
          <div class="amt">$${Number(r.amount || 0).toFixed(2)}</div>
          <div class="row"><span>Employee</span><b>${esc(r.user_name)}</b></div>
          <div class="row"><span>Project</span><b>${esc(r.project_name || "—")}</b></div>
          <div class="row"><span>Date</span><b>${esc(fmtDateFull(r.receipt_date))}</b></div>
          ${r.note ? `<div class="note">${esc(r.note)}</div>` : ""}
        </div>
      </div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipts${label ? " — " + esc(label) : ""}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1512;padding:22px;}
        h1{font-size:20px;} .sub{color:#857b6e;font-size:12.5px;margin:2px 0 18px;}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
        .card{border:1px solid #e7ded0;border-radius:10px;padding:10px;display:flex;gap:12px;page-break-inside:avoid;break-inside:avoid;}
        .card img{width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e7ded0;flex-shrink:0;}
        .ph{width:120px;height:120px;border-radius:8px;background:#f7f3ec;display:flex;align-items:center;justify-content:center;font-size:44px;flex-shrink:0;}
        .meta{flex:1;min-width:0;} .amt{font-size:21px;font-weight:800;color:#1f7a45;margin-bottom:6px;}
        .row{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px dotted #ece4d6;}
        .row span{color:#857b6e;} .row b{text-align:right;}
        .note{margin-top:7px;font-size:11.5px;color:#6b6058;font-style:italic;}
        @media print{ body{padding:10mm;} @page{margin:10mm;} }
      </style></head><body>
      <h1>Receipt Reimbursement</h1>
      <div class="sub">${label ? esc(label) + " · " : ""}${list.length} receipt${list.length === 1 ? "" : "s"} · Total <b>$${total.toFixed(2)}</b></div>
      <div class="grid">${cards}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
      </body></html>`);
    w.document.close();
  };

  const submitSuggestion = async () => {
    if (!sgMsg.trim()) {
      show("Enter a message first");
      return;
    }
    setSgSaving(true);
    try {
      await api("suggestions", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.name,
          type: sgType,
          message: sgMsg.trim()
        })
      });
      setSgMsg("");
      await load();
      show("Sent to the admin team — thanks!");
    } catch (e) {
      show("Error sending — try again");
    }
    setSgSaving(false);
  };

  // "Clear" = an admin has seen it (records who/when); resolving happens
  // separately in the Admin > Suggestions hub. After clearing, chain straight
  // to the next pending item so nothing gets missed in one sitting.
  const clearSuggestion = async id => {
    try {
      await api(`suggestions?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          cleared_by: user.id,
          cleared_by_name: user.name,
          cleared_at: new Date().toISOString()
        })
      });
      const refreshed = await api("suggestions?order=created_at.desc");
      setSuggestions(refreshed);
      setSgPopup(null);
      setSgDetail(d => (d && d.id === id ? refreshed.find(s => s.id === id) || null : d));
      const next = refreshed
        .filter(s => !s.cleared_at && s.id !== id)
        .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      if (next.length > 0) setTimeout(() => setSgPopup(next[0]), 260);
    } catch (e) {
      show("Error clearing");
    }
  };

  const resolveSuggestion = async (id, resolved) => {
    try {
      await api(`suggestions?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolved_by: resolved ? user.id : null,
          resolved_by_name: resolved ? user.name : null
        })
      });
      const refreshed = await api("suggestions?order=created_at.desc");
      setSuggestions(refreshed);
      setSgDetail(d => (d && d.id === id ? refreshed.find(s => s.id === id) || null : d));
      show(resolved ? "Marked complete" : "Marked not complete");
    } catch (e) {
      show("Error updating");
    }
  };

  const saveProj = async () => {
    if (!nPN.trim() || !nPA.trim()) {
      show("Need name and address");
      return;
    }
    try {
      await api("projects", {
        method: "POST",
        body: JSON.stringify({ name: nPN.trim(), address: nPA.trim() })
      });
      await load();
      setProjMod(false);
      setNPN("");
      setNPA("");
      show("Project added");
    } catch (e) {
      show("Error");
    }
  };

  const saveSettings = async () => {
    try {
      await api(`mileage_settings?id=eq.${settings.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          irs_rate: parseFloat(settingsRate) || 0.70,
          pay_period_anchor: settingsAnchor,
          pay_period_frequency: settingsFreq,
          pay_period_time: settingsTime,
          updated_at: new Date().toISOString()
        })
      });
      await load();
      show("Settings saved");
    } catch (e) {
      show("Error");
    }
  };

  const approveTrip = async id => {
    try {
      await api(`trips?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" })
      });
      await load();
      show("Approved");
    } catch (e) {
      show("Error");
    }
  };

  const rejectTrip = async id => {
    try {
      await api(`trips?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" })
      });
      await load();
      show("Rejected");
    } catch (e) {
      show("Error");
    }
  };

  const deleteTrip = async id => {
    try {
      await api(`trips?id=eq.${id}`, { method: "DELETE" });
      await load();
      show("Deleted");
    } catch (e) {
      show("Error");
    }
  };

  const openEdit = t => {
    setET(t);
    setEdFr(t.from_project_id);
    setEdTo(t.to_project_id);
    setEdDt(t.trip_date);
    setEdNt(t.note || "");
    setEditMod(true);
  };

  const saveEdit = async () => {
    if (!edFr || !edTo) {
      show("Pick from and to");
      return;
    }
    const fP = projs.find(p => p.id === edFr);
    const tP = projs.find(p => p.id === edTo);
    let miles = Number(editT.miles);
    let reimb = Number(editT.reimbursement);
    if (edFr !== editT.from_project_id || edTo !== editT.to_project_id) {
      setCalc(true);
      // getDrivingMiles takes ADDRESS STRINGS plus the project objects, so it
      // can prefer each project's stored coordinates over re-geocoding the
      // address text (which is what produced wrong, too-short mileages).
      const m = await getDrivingMiles(fP.address, tP.address, fP, tP);
      if (m) {
        miles = m;
        reimb = reimbursement(m, settings.irs_rate);
      }
      setCalc(false);
    }
    try {
      await api(`trips?id=eq.${editT.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          from_project_id: fP.id,
          from_project_name: fP.name,
          from_address: fP.address,
          to_project_id: tP.id,
          to_project_name: tP.name,
          to_address: tP.address,
          trip_date: edDt,
          note: edNt,
          miles,
          reimbursement: reimb
        })
      });
      await load();
      setEditMod(false);
      show("Trip updated");
    } catch (e) {
      show("Error updating");
    }
  };

  const shareApp = () => {
    const phones = sharePhones.split(/[,\n;]/).map(p => p.replace(/\D/g, "")).filter(p => p.length >= 10);
    if (phones.length === 0) {
      show("Enter valid phone number(s)");
      return;
    }
    const url = window.location.origin;
    const body = `Masterpiece Mileage Tracker - log your trips here: ${url}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const sep = isIOS ? "&" : "?";
    try {
      window.location.href = `sms:${phones.join(",")}${sep}body=${encodeURIComponent(body)}`;
      setShareMod(false);
      setSharePhones("");
      show("Opening messages...");
    } catch (e) {
      show("Could not open messages app");
    }
  };

  const togUser = async (id, a) => {
    try {
      await api(`yard_users?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !a })
      });
      await load();
      show(a ? "Deactivated" : "Activated");
    } catch (e) {
      show("Error");
    }
  };

  const chRole = async (id, r) => {
    try {
      await api(`yard_users?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: r })
      });
      await load();
      show("Role updated");
    } catch (e) {
      show("Error");
    }
  };

  const saveEU = async () => {
    if (!euN.trim()) {
      show("Name is required");
      return;
    }
    try {
      // Only the display name lives here. The login email + password are the
      // employee's Supabase Auth identity — changed by them, not patched into
      // the profile (patching profile email would desync it from the login).
      await api(`yard_users?id=eq.${editUser}`, {
        method: "PATCH",
        body: JSON.stringify({ name: euN.trim() })
      });
      await load();
      setEU(null);
      show("Employee updated");
    } catch (e) {
      show("Error");
    }
  };

  const delUser = async id => {
    try {
      await api(`yard_users?id=eq.${id}`, { method: "DELETE" });
      await load();
      setDUM(null);
      show("Employee deleted");
    } catch (e) {
      show("Error");
    }
  };

  const myTrips = trips.filter(t => t.user_id === user?.id);
  const myActiveTrips = myTrips.filter(t => t.status !== "rejected");
  const myRejectedTrips = myTrips.filter(t => t.status === "rejected").sort((a, b) => (b.trip_date || "").localeCompare(a.trip_date || ""));
  const pp = getPayPeriod(today(), settings.pay_period_anchor, settings.pay_period_frequency, settings.pay_period_time);
  const selPP = getPayPeriod(today(), settings.pay_period_anchor, settings.pay_period_frequency, settings.pay_period_time, settings.pay_period_timezone || "America/Denver", payPeriodOffset);
  const ppList = (() => {
    if (!settings.pay_period_anchor) return [{ offset: 0, ...pp }];
    const tz = settings.pay_period_timezone || "America/Denver";
    const arr = [];
    for (let o = 0; o > -60; o--) {
      const p = getPayPeriod(today(), settings.pay_period_anchor, settings.pay_period_frequency, settings.pay_period_time, tz, o);
      if (p.start < settings.pay_period_anchor) break;
      arr.push({ offset: o, ...p });
    }
    return arr;
  })();
  const todayTrips = myTrips.filter(t => t.trip_date === today());
  const ppTrips = myTrips.filter(
    t => t.trip_date >= pp.start && t.trip_date <= pp.end
  );
  const ytdTrips = myTrips.filter(t => t.trip_date >= `${thisYear()}-01-01`);
  const todayMiles = todayTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);
  const ppMiles = ppTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);
  const ytdMiles = ytdTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);

  const allFilteredTrips = trips.filter(t => {
    const userMatch = reportUser === "all" || t.user_id === reportUser;
    let periodMatch = true;
    
    if (reportPeriod === "current") {
      periodMatch = t.trip_date >= selPP.start && t.trip_date <= selPP.end;
    } else if (reportPeriod === "monthly") {
      const [my, mm] = reportMonth.split("-").map(Number);
      const monthStart = `${reportMonth}-01`;
      const monthEnd = `${reportMonth}-${String(new Date(my, mm, 0).getDate()).padStart(2, "0")}`;
      periodMatch = t.trip_date >= monthStart && t.trip_date <= monthEnd;
    } else if (reportPeriod === "ytd") {
      periodMatch = t.trip_date >= `${thisYear()}-01-01`;
    }
    
    return userMatch && periodMatch;
  }).sort((a, b) => {
    if (a.user_id === user?.id && b.user_id !== user?.id) return -1;
    if (b.user_id === user?.id && a.user_id !== user?.id) return 1;
    return (a.user_name || "").localeCompare(b.user_name || "");
  });
  const activeTrips = allFilteredTrips.filter(t => t.status !== "rejected");
  const rejectedTrips = allFilteredTrips.filter(t => t.status === "rejected");
  const reportTrips = showRejected ? rejectedTrips : activeTrips;
  
  const reportMiles = reportTrips.reduce((s, t) => s + Number(t.miles), 0);
  const reportReimb = reportTrips.reduce(
    (s, t) => s + Number(t.reimbursement),
    0
  );
  const userTotals = reportTrips.reduce((acc, t) => {
    const k = t.user_name || "Unknown";
    if (!acc[k]) acc[k] = { miles: 0, reimb: 0, count: 0 };
    acc[k].miles += Number(t.miles);
    acc[k].reimb += Number(t.reimbursement);
    acc[k].count++;
    return acc;
  }, {});

  const inReportPeriod = d => {
    if (reportPeriod === "current") return d >= selPP.start && d <= selPP.end;
    if (reportPeriod === "monthly") {
      const [my, mm] = reportMonth.split("-").map(Number);
      const ms = `${reportMonth}-01`;
      const me = `${reportMonth}-${String(new Date(my, mm, 0).getDate()).padStart(2, "0")}`;
      return d >= ms && d <= me;
    }
    if (reportPeriod === "ytd") return d >= `${thisYear()}-01-01`;
    return true;
  };
  const reportReceipts = receipts.filter(r => {
    const userMatch = reportUser === "all" || r.user_id === reportUser;
    return userMatch && inReportPeriod(r.receipt_date);
  });
  const userReceiptTotals = reportReceipts.reduce((acc, r) => {
    const k = r.user_name || "Unknown";
    if (!acc[k]) acc[k] = { amount: 0, count: 0 };
    acc[k].amount += Number(r.amount);
    acc[k].count++;
    return acc;
  }, {});
  const myReceipts = receipts.filter(r => r.user_id === user?.id);
  const mySuggestions = suggestions
    .filter(s => s.user_id === user?.id)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const pendingSgCount = suggestions.filter(s => !s.cleared_at).length;

  const exportCSV = () => {
    const rows = [
      [
        "Date",
        "Employee",
        "From",
        "To",
        "Miles",
        "IRS Rate",
        "Reimbursement",
        "Status"
      ]
    ];
    reportTrips.forEach(t =>
      rows.push([
        t.trip_date,
        t.user_name,
        t.from_project_name,
        t.to_project_name,
        t.miles,
        `$${t.irs_rate}`,
        `$${Number(t.reimbursement).toFixed(2)}`,
        t.status
      ])
    );
    if (!showRejected && reportReceipts.length > 0) {
      rows.push([]);
      rows.push(["RECEIPTS"]);
      rows.push(["Date", "Employee", "Note", "", "", "", "Amount", ""]);
      reportReceipts.forEach(r =>
        rows.push([
          r.receipt_date,
          r.user_name,
          (r.note || "").replace(/,/g, ";"),
          "",
          "",
          "",
          `$${Number(r.amount).toFixed(2)}`,
          ""
        ])
      );
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage-report-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("Report downloaded");
  };

  const printReport = () => {
    window.print();
  };

  const emailReport = async () => {
    if (!emailTo.trim()) {
      show("Enter email address");
      return;
    }
    const rows = [
      [
        "Date",
        "Employee",
        "From",
        "To",
        "Miles",
        "IRS Rate",
        "Reimbursement",
        "Status"
      ]
    ];
    reportTrips.forEach(t =>
      rows.push([
        t.trip_date,
        t.user_name,
        t.from_project_name,
        t.to_project_name,
        t.miles,
        `$${t.irs_rate}`,
        `$${Number(t.reimbursement).toFixed(2)}`,
        t.status
      ])
    );
    const csv = rows.map(r => r.join(",")).join("\n");
    
    try {
      const periodLabel = reportPeriod === 'current' ? 'Current Pay Period' : reportPeriod === 'monthly' ? 'Monthly Mileage' : reportPeriod === 'ytd' ? 'Year to Date' : 'All Time';
      const periodDates = reportPeriod === 'current' ? `${fmtDate(selPP.start)} - ${fmtDate(selPP.end)}` : reportPeriod === 'monthly' ? new Date(reportMonth + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : reportPeriod === 'ytd' ? `${thisYear()} YTD` : 'All Time';
      const subject = `Mileage Report - ${periodLabel}`;
      const body = `Mileage Report\n\nPeriod: ${periodDates}\n${reportUser !== 'all' ? `Employee: ${users.find(u => u.id === reportUser)?.name}\n` : ''}Total Miles: ${reportMiles.toFixed(1)}\nTotal Reimbursement: $${reportReimb.toFixed(2)}\nTrips: ${reportTrips.length}\n\nCSV Report attached below:\n\n${csv}`;
      
      const mailto = `mailto:${emailTo.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      setEmailMod(false);
      setEmailTo("");
      show("Email client opened");
    } catch (e) {
      show("Error opening email");
    }
  };

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}

@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes mpRise{from{opacity:0;transform:translateY(14px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes mpScrim{from{opacity:0}to{opacity:1}}
@keyframes mpSheen{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}
@keyframes mpShimmer{0%{background-position:-160% 0}100%{background-position:260% 0}}

.mp-paper{position:relative}
.mp-paper::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(120% 75% at 50% -8%, rgba(255,255,255,.55), transparent 60%),radial-gradient(140% 120% at 50% 120%, rgba(120,86,46,.07), transparent 62%)}
.mp-paper::after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.42 0 0 0 0 0.32 0 0 0 0 0.18 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.mp-paper>*{position:relative;z-index:1}

:focus-visible{outline:none}
.mp-focusable:focus-visible,button:focus-visible,a:focus-visible{outline:none;box-shadow:0 0 0 3px #f7f3ec, 0 0 0 5px rgba(196,30,42,.85);border-radius:10px}

.mp-btn{position:relative;overflow:hidden;isolation:isolate;box-shadow:0 1px 2px rgba(58,42,28,.10), 0 2px 8px rgba(196,30,42,.16), inset 0 1px 0 rgba(255,255,255,.22);transition:transform .14s cubic-bezier(.16,1,.3,1), box-shadow .22s cubic-bezier(.16,1,.3,1), filter .14s ease;will-change:transform;-webkit-tap-highlight-color:transparent}
.mp-btn::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-120%) skewX(-18deg);opacity:0}
.mp-btn:not([data-disabled="true"]):hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(58,42,28,.16), 0 6px 20px rgba(196,30,42,.30), 0 0 0 1px rgba(196,30,42,.45), inset 0 1px 0 rgba(255,255,255,.28);filter:saturate(1.05) brightness(1.02)}
.mp-btn:not([data-disabled="true"]):hover::after{opacity:1;animation:mpSheen .9s cubic-bezier(.16,1,.3,1)}
.mp-btn:not([data-disabled="true"]):active{transform:translateY(0) scale(.985);box-shadow:0 1px 2px rgba(58,42,28,.14), inset 0 2px 5px rgba(0,0,0,.22)}
.mp-btn[data-disabled="true"]{filter:grayscale(.25);box-shadow:none;transform:none;cursor:default}
.mp-btn[data-disabled="true"]::after{display:none}

.mp-card{box-shadow:0 1px 2px rgba(58,42,28,.05),0 4px 14px rgba(58,42,28,.07), inset 0 1px 0 rgba(255,255,255,.7);transition:transform .24s cubic-bezier(.16,1,.3,1), box-shadow .24s cubic-bezier(.16,1,.3,1)}
.mp-card-i:hover{transform:translateY(-3px);box-shadow:0 2px 6px rgba(58,42,28,.06),0 16px 38px rgba(58,42,28,.14), inset 0 1px 0 rgba(255,255,255,.8)}
.mp-card-i:active{transform:translateY(-1px)}

.mp-kpi{transition:transform .2s cubic-bezier(.16,1,.3,1),box-shadow .2s ease}
.mp-kpi:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(58,42,28,.13), inset 0 1px 0 rgba(255,255,255,.8)}

/* ---- glow card: glowing colored top edge + soft colored halo (light/warm) ---- */
.mp-glow{position:relative;border-radius:18px;background:var(--gc,linear-gradient(180deg,#fffefb 0%,#fdfaf4 100%));border:1px solid #e7ded0;box-shadow:0 1px 2px rgba(58,42,28,.05), 0 12px 30px -10px var(--gw,rgba(196,30,42,.22)), inset 0 1px 0 rgba(255,255,255,.7);transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease;overflow:hidden;isolation:isolate}
.mp-glow::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;background:var(--ge,#c41e2a);box-shadow:0 0 16px 1px var(--ge,#c41e2a), 0 0 5px var(--ge,#c41e2a);z-index:1}
.mp-glow:hover{transform:translateY(-3px);box-shadow:0 2px 6px rgba(58,42,28,.06), 0 20px 44px -10px var(--gw,rgba(196,30,42,.36)), inset 0 1px 0 rgba(255,255,255,.8)}
@media (prefers-reduced-motion:reduce){.mp-glow:hover{transform:none}}

.mp-stripe{height:3px;border:0;border-radius:3px;background:linear-gradient(90deg,#c4b59a 0 33.33%,#c41e2a 33.33% 66.66%,#1a1512 66.66% 100%)}
.mp-rule-gold{height:1px;border:0;background:linear-gradient(90deg,transparent,rgba(176,141,87,.55),transparent)}

input,select,textarea{transition:border-color .14s ease, box-shadow .16s ease, background .14s ease}
input:focus,select:focus,textarea:focus{border-color:#c41e2a!important;box-shadow:0 0 0 4px rgba(196,30,42,.10), inset 0 1px 2px rgba(58,42,28,.06)!important}
input::placeholder,textarea::placeholder{color:#b6ab9c}
input[aria-invalid="true"],select[aria-invalid="true"]{border-color:#c2740a!important;box-shadow:0 0 0 4px rgba(194,116,10,.12)!important}

.mp-scrim{background:rgba(40,28,18,.42);backdrop-filter:blur(8px) saturate(1.1);-webkit-backdrop-filter:blur(8px) saturate(1.1);animation:mpScrim .28s ease}
.mp-sheet{box-shadow:0 -10px 48px rgba(40,28,18,.22), inset 0 1px 0 rgba(255,255,255,.85);background:linear-gradient(180deg,#fffefb 0%,#fdfaf4 100%)}
.mp-nav{background:rgba(255,253,250,.82);backdrop-filter:blur(16px) saturate(1.25);-webkit-backdrop-filter:blur(16px) saturate(1.25)}
.mp-bar{backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4)}

.mp-tab{position:relative;transition:background-color .16s ease,color .16s ease,transform .12s ease,box-shadow .16s ease}
.mp-tab:hover{transform:translateY(-1px)}
.mp-tab:active{transform:translateY(0)}

.mp-badge{font-family:'IBM Plex Mono',monospace;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-radius:999px;display:inline-flex;align-items:center;gap:4px;line-height:1}

.mp-menu-item{transition:background-color .12s ease}
.mp-menu-item:hover{background:rgba(196,30,42,.05)}
.mp-shimmer{background:linear-gradient(100deg,#efe8dc 30%,#f6f1e8 50%,#efe8dc 70%);background-size:220% 100%;animation:mpShimmer 1.4s ease-in-out infinite;border-radius:8px}
.mp-display{font-family:'Bitter',serif;letter-spacing:-.012em;line-height:1.08}
.mp-eyebrow{font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.13em;font-size:10px;font-weight:700;color:#8a6a33}
.mp-num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.01em}

*{scrollbar-width:thin;scrollbar-color:#d3c7b2 transparent}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:linear-gradient(#d3c7b2,#c4b59a);border-radius:8px;border:2px solid #f7f3ec}
::-webkit-scrollbar-thumb:hover{background:#b9a888}
::-webkit-scrollbar-track{background:transparent}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
  .mp-btn:hover,.mp-card-i:hover,.mp-kpi:hover,.mp-tab:hover{transform:none}
}

@media print{
  nav,button,.no-print{display:none!important}
  .mp-paper::before,.mp-paper::after{display:none!important}
  *{box-shadow:none!important;text-shadow:none!important;background-image:none!important;filter:none!important;animation:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  body,.mp-paper{background:#fff!important}
  .mp-bar{background:#fff!important;color:#1a1512!important}
  .mp-card,.mp-kpi,.mp-sheet{background:#fff!important;border:1px solid #ddd5c7!important}
  .mp-stripe{background:#1a1512!important;height:1px!important}
}`;

  // Landed here from the emailed confirmation link. This IS the real
  // verification moment — take priority over everything else, including
  // the normal login screen, until they've set a password.
  if (recoveryMode)
    return (
      <div
        className="mp-paper"
        style={{
          minHeight: "100vh",
          background: P.gPaper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: Ft.b
        }}
      >
        <style>{css}</style>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
          <hr className="mp-stripe" style={{ marginBottom: 28, width: "100%" }} />
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex" }}>
              <Logo />
            </div>
            <p className="mp-eyebrow" style={{ textAlign: "center", marginTop: 12 }}>
              Email Confirmed ✓
            </p>
          </div>
          <div className="mp-glow" style={{ padding: "20px 18px 22px", "--ge": P.grn, "--gw": "rgba(31,122,69,.28)" }}>
            <p style={{ fontSize: 13, color: P.mid, margin: "0 0 16px", lineHeight: 1.5 }}>
              You're verified — last step. Create the password you'll use to log in from now on.
            </p>
            <Fl label="New Password">
              <input
                style={iS}
                type="password"
                value={recoveryPw}
                onChange={e => setRecoveryPw(e.target.value)}
                placeholder="At least 8 characters"
              />
            </Fl>
            <Fl label="Confirm Password">
              <input
                style={iS}
                type="password"
                value={recoveryPw2}
                onChange={e => setRecoveryPw2(e.target.value)}
                placeholder="Re-enter your password"
                onKeyDown={e => { if (e.key === "Enter") finishRecoverySetup(); }}
              />
            </Fl>
            {recoveryErr && (
              <div style={{ color: P.red, fontSize: 13, marginBottom: 12, fontFamily: Ft.m }}>
                {recoveryErr}
              </div>
            )}
            <Btn full color={P.grn} disabled={recoverySaving} onClick={finishRecoverySetup}>
              {recoverySaving ? "Finishing..." : "Set Password & Finish Setup"}
            </Btn>
          </div>
        </div>
      </div>
    );

  if (!user)
    return (
      <div
        className="mp-paper"
        style={{
          minHeight: "100vh",
          background: P.gPaper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: Ft.b
        }}
      >
        <style>{css}</style>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
          <hr className="mp-stripe" style={{ marginBottom: 28, width: "100%" }} />
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex" }}>
              <Logo />
            </div>
            <p className="mp-eyebrow" style={{ textAlign: "center", marginTop: 12 }}>
              Employee Mileage Tracker
            </p>
          </div>

          {showSetupNotice && (
            <div
              style={{
                position: "relative",
                background: P.aBg,
                border: `1px solid rgba(194,116,10,.28)`,
                borderRadius: 12,
                padding: "13px 34px 13px 14px",
                marginBottom: 20
              }}
            >
              <button
                onClick={dismissSetupNotice}
                aria-label="Dismiss"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "none",
                  border: "none",
                  color: P.amb,
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 4,
                  lineHeight: 1
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.amb, fontFamily: Ft.b, marginBottom: 4 }}>
                🔐 We've switched to secure login
              </div>
              <div style={{ fontSize: 12.5, color: P.mid, fontFamily: Ft.b, lineHeight: 1.5 }}>
                PINs are gone — everyone now signs in with their work email and a password they create. First time back? Tap <strong>First-Time Setup</strong> below, confirm it's you with your email and old PIN, then check your email for a link to finish setting your password.
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              background: P.bdrL,
              borderRadius: 10,
              padding: 3,
              marginBottom: 24
            }}
          >
            {["login", "setup"].map(m => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setAErr("");
                  setSetupSentTo(null);
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: mode === m ? P.gCard : "transparent",
                  color: mode === m ? P.txt : P.lt,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: Ft.b,
                  boxShadow: mode === m ? P.sh1 : "none"
                }}
              >
                {m === "login" ? "Log In" : "First-Time Setup"}
              </button>
            ))}
          </div>
          <div
            className="mp-glow"
            style={{ padding: "20px 18px 22px", "--ge": P.red, "--gw": "rgba(196,30,42,.32)" }}
          >
          {mode === "setup" && setupSentTo && (
            <div style={{ textAlign: "center", padding: "8px 4px" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: P.txt, margin: "0 0 8px", fontFamily: Ft.b }}>
                Check your email
              </p>
              <p style={{ fontSize: 12.5, color: P.mid, margin: "0 0 18px", lineHeight: 1.5, fontFamily: Ft.b }}>
                We sent a link to <strong>{setupSentTo}</strong>. Click it to confirm it's really you and set your password — that's the whole rest of setup. Not there in a minute? Check spam.
              </p>
              <button
                onClick={() => { setSetupSentTo(null); setAErr(""); }}
                style={{ background: "none", border: "none", color: P.red, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: Ft.b }}
              >
                Wrong email? Start over
              </button>
            </div>
          )}
          {mode === "setup" && !setupSentTo && (
            <>
              <p style={{ fontSize: 12.5, color: P.mid, margin: "0 0 16px", fontFamily: Ft.b, lineHeight: 1.5 }}>
                First time here? Confirm it's you with your work email and your
                current 4-digit PIN. We'll email you a link to finish setting up
                your password.
              </p>
              <Fl label="Work Email">
                <input
                  style={iS}
                  type="email"
                  value={aEmail}
                  onChange={e => setAE(e.target.value)}
                  placeholder="you@masterpiecelv.com"
                />
              </Fl>
              <Fl label="Your Current PIN">
                <input
                  style={{ ...iS, textAlign: "center", fontSize: 20, letterSpacing: 10, fontFamily: Ft.m }}
                  inputMode="numeric"
                  maxLength={4}
                  value={aPin}
                  onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  onKeyDown={e => { if (e.key === "Enter") setupAccount(); }}
                />
              </Fl>
              {aErr && (
                <div
                  style={{
                    color: P.red,
                    fontSize: 13,
                    marginBottom: 12,
                    fontFamily: Ft.m
                  }}
                >
                  {aErr}
                </div>
              )}
              <Btn full disabled={aSaving} onClick={setupAccount}>
                {aSaving ? "Sending..." : "Send Me a Setup Link"}
              </Btn>
            </>
          )}
          {mode === "login" && (
            <>
              <Fl label="Email">
                <input
                  style={iS}
                  type="email"
                  value={aEmail}
                  onChange={e => setAE(e.target.value)}
                  placeholder="you@email.com"
                  onKeyDown={e => { if (e.key === "Enter") document.getElementById("pw")?.focus(); }}
                />
              </Fl>
              <Fl label="Password">
                <input
                  id="pw"
                  style={iS}
                  type="password"
                  value={aPass}
                  onChange={e => setAPass(e.target.value)}
                  placeholder="Your password"
                  onKeyDown={e => { if (e.key === "Enter") login(); }}
                />
              </Fl>
              {aErr && (
                <div
                  style={{
                    color: P.red,
                    fontSize: 13,
                    marginBottom: 12,
                    fontFamily: Ft.m
                  }}
                >
                  {aErr}
                </div>
              )}
              <Btn full onClick={login}>
                Enter Mileage Tracker
              </Btn>
            </>
          )}
          </div>
        </div>
      </div>
    );

  if (!loaded)
    return (
      <div
        className="mp-paper"
        style={{
          minHeight: "100vh",
          background: P.gPaper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: Ft.m,
          color: P.lt
        }}
      >
        <style>{css}</style>
        <div className="mp-shimmer" style={{ width: 180, height: 14 }} />
      </div>
    );

  return (
    <div
      className="mp-paper"
      style={{
        minHeight: "100vh",
        background: P.gPaper,
        fontFamily: Ft.b,
        paddingBottom: 80
      }}
    >
      <style>{css}</style>
      <div
        className="mp-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 950,
          padding: "14px 16px",
          background: P.gInkBar,
          borderBottom: `1px solid ${P.inkBdr}`,
          boxShadow: P.shBar,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: P.gStripe }} />
        <Logo dark />
        <div ref={userMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="mp-focusable"
            title="Account menu"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(255,255,255,.08)",
              border: `1px solid ${P.inkBdr}`,
              borderRadius: 999,
              padding: "3px 10px 3px 3px",
              cursor: "pointer"
            }}
          >
            <Avatar u={user} size={22} />
            <span style={{ fontSize: 12, color: P.onInkMid, fontFamily: Ft.m, fontWeight: 600 }}>
              {user.name}
            </span>
            <span style={{ fontSize: 8, color: P.onInkMid }}>{userMenuOpen ? "▴" : "▾"}</span>
            {isA && pendingSgCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: P.gRed,
                  boxShadow: `0 0 0 2px ${P.gInkBar}`
                }}
              />
            )}
          </button>

          {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 998,
                  minWidth: 215,
                  background: P.gCard,
                  borderRadius: 14,
                  border: `1px solid ${P.bdr}`,
                  boxShadow: P.sh3,
                  overflow: "hidden",
                  animation: "fadeIn .16s ease"
                }}
              >
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.bdrL}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.txt, fontFamily: Ft.h }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 1 }}>
                    {user.email}
                  </div>
                  {isA && (
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: Ft.m,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: P.red,
                        background: P.rBg,
                        borderRadius: 5,
                        padding: "2px 7px",
                        marginTop: 6
                      }}
                    >
                      {RLBL[user.role]}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setTab("profile"); setUserMenuOpen(false); }}
                  className="mp-menu-item"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: Ft.b, color: P.txt }}
                >
                  👤 View Profile
                </button>
                <button
                  onClick={() => { setPwMod(true); setUserMenuOpen(false); }}
                  className="mp-menu-item"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: Ft.b, color: P.txt }}
                >
                  🔑 Change Password
                </button>
                {isA && (
                  <button
                    onClick={() => { setTab("admin"); setAdPg("hub"); setUserMenuOpen(false); }}
                    className="mp-menu-item"
                    style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: Ft.b, color: P.txt }}
                  >
                    <span>🛠️ Admin</span>
                    {pendingSgCount > 0 && (
                      <span style={{ background: P.gRed, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 7px", fontFamily: Ft.m }}>
                        {pendingSgCount}
                      </span>
                    )}
                  </button>
                )}
                <div style={{ borderTop: `1px solid ${P.bdrL}` }} />
                <button
                  onClick={() => {
                    authSignOut();
                    setUser(null);
                    setAN("");
                    setAP("");
                    setAPass("");
                    setAdPg("hub");
                    setSgPromptDone(false);
                    setSgPopup(null);
                    setUserMenuOpen(false);
                  }}
                  className="mp-menu-item"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: Ft.b, color: P.red }}
                >
                  🚪 Log Out
                </button>
              </div>
          )}
        </div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        {tab === "log" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <h2
              style={{
                fontFamily: Ft.h,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 16px"
              }}
            >
              Log Trip
            </h2>
            {isA && (
              <Fl label="Logging Trip For">
                <select
                  style={{ ...iS, appearance: "none" }}
                  value={logForUser || user.id}
                  onChange={e => setLogForUser(e.target.value === user.id ? "" : e.target.value)}
                >
                  <option value={user.id}>{user.name} (me)</option>
                  {users.filter(u => u.active && u.id !== user.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Fl>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 20
              }}
            >
              <div
                className="mp-glow"
                style={{
                  padding: "13px 15px 14px",
                  "--ge": P.tan,
                  "--gw": "rgba(196,181,154,.5)"
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: Ft.m,
                    color: P.lt,
                    textTransform: "uppercase",
                    letterSpacing: 1
                  }}
                >
                  Today
                </div>
                <div className="mp-num mp-display" style={{ fontSize: 24, fontWeight: 700 }}>
                  {todayMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
              <div
                className="mp-glow"
                style={{
                  padding: "13px 15px 14px",
                  "--ge": P.red,
                  "--gw": "rgba(196,30,42,.42)"
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: Ft.m,
                    color: P.lt,
                    textTransform: "uppercase",
                    letterSpacing: 1
                  }}
                >
                  Pay Period
                </div>
                <div className="mp-num mp-display" style={{ fontSize: 24, fontWeight: 700, color: P.red }}>
                  {ppMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
              <div
                className="mp-glow"
                style={{
                  padding: "13px 15px 14px",
                  "--ge": P.gold,
                  "--gw": "rgba(176,141,87,.45)"
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: Ft.m,
                    color: P.lt,
                    textTransform: "uppercase",
                    letterSpacing: 1
                  }}
                >
                  YTD
                </div>
                <div className="mp-num mp-display" style={{ fontSize: 24, fontWeight: 700 }}>
                  {ytdMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
            </div>
            <div
              style={{
                background: P.gCard,
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${P.bdr}`,
                borderTop: `3px solid ${P.tan}`,
                boxShadow: P.sh2,
                marginBottom: 16
              }}
            >
              <Fl label="From (Project)">
                <select
                  value={fromId}
                  onChange={e => setFromId(e.target.value)}
                  style={{ ...iS, appearance: "none" }}
                >
                  <option value="">Select starting project...</option>
                  {projs
                    .filter(p => p.address)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Fl>
              <div
                style={{
                  textAlign: "center",
                  color: P.lt,
                  fontSize: 20,
                  margin: "-4px 0 4px"
                }}
              >
                ↓
              </div>
              <Fl label="To (Project)">
                <select
                  value={toId}
                  onChange={e => setToId(e.target.value)}
                  style={{ ...iS, appearance: "none" }}
                >
                  <option value="">Select destination project...</option>
                  {projs
                    .filter(p => p.address && p.id !== fromId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Fl>
              {(user?.role === "admin" || user?.role === "senior_admin" || user?.role === "super_admin") && (
                <Fl label="Trip Date (Admin Only)">
                  <input
                    type="date"
                    style={iS}
                    value={tripDate}
                    onChange={e => setTripDate(e.target.value)}
                  />
                </Fl>
              )}
              <Fl label="Note (optional)">
                <input
                  style={iS}
                  value={tripNote}
                  onChange={e => setTripNote(e.target.value)}
                  placeholder="e.g. picking up materials"
                />
              </Fl>
              <Btn
                full
                disabled={!fromId || !toId || fromId === toId || calculating}
                onClick={logTrip}
              >
                {calculating ? "Calculating route..." : "Log Trip"}
              </Btn>
              <div
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 11,
                  color: P.lt,
                  fontFamily: Ft.m
                }}
              >
                IRS Rate: ${settings.irs_rate}/mile · {settings.pay_period_frequency === "weekly" ? "Weekly" : settings.pay_period_frequency === "monthly" ? "Monthly" : "Bi-weekly"} Period:{" "}
                {fmtDate(pp.start)} – {fmtDate(pp.end)}
              </div>
            </div>
            {todayTrips.length > 0 && (
              <>
                <h3
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 14,
                    fontWeight: 700,
                    margin: "0 0 10px"
                  }}
                >
                  Today's Trips
                </h3>
                {todayTrips.flatMap((t, i, arr) => {
                  const sep = i > 0 && t.trip_date !== arr[i - 1].trip_date;
                  const card = (
                    <div
                      key={t.id}
                      style={{
                        padding: "12px 14px",
                        background: P.gCard,
                        borderRadius: 12,
                        border: `1px solid ${P.bdr}`,
                        marginBottom: 8
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {t.from_project_name} → {t.to_project_name}
                          </div>
                          {t.note && (
                            <div
                              style={{
                                fontSize: 12,
                                color: P.lt,
                                marginTop: 2,
                                fontStyle: "italic"
                              }}
                            >
                              {t.note}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              fontFamily: Ft.h,
                              color: P.red
                            }}
                          >
                            {Number(t.miles).toFixed(1)} mi
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: P.grn,
                              fontFamily: Ft.m
                            }}
                          >
                            ${Number(t.reimbursement).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {isA && (
                        <button
                          onClick={() => openEdit(t)}
                          style={{
                            fontSize: 11,
                            color: P.mid,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            marginTop: 6,
                            fontFamily: Ft.m,
                            padding: 0
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  );
                  return sep
                    ? [
                        <div
                          key={`sep-${t.id}`}
                          style={{ borderTop: `2px solid ${P.red}`, margin: "16px 0" }}
                        />,
                        card
                      ]
                    : [card];
                })}
              </>
            )}
          </div>
        )}

        {tab === "receipts" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px" }}>
              <h2 style={{ fontFamily: Ft.h, fontSize: 20, fontWeight: 700, margin: 0 }}>
                Receipts
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                {myReceipts.length > 0 && (
                  <Btn small color={P.blk} onClick={() => printReceipts(myReceipts, `${user.name} · all receipts`)}>
                    🖨️ Print
                  </Btn>
                )}
                <Btn small onClick={() => { setEditRc(null); setRcAmt(""); setRcDate(today()); setRcNote(""); setRcFile(null); setRcPreview(""); setRcForUser(""); setRcProj(""); setRcMod(true); }}>
                  + Add Receipt
                </Btn>
              </div>
            </div>
            {myReceipts.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: P.lt, fontFamily: Ft.m }}>
                No receipts yet
              </div>
            )}
            {myReceipts.map(r => (
              <div
                key={r.id}
                style={{
                  padding: "12px 14px",
                  background: P.gCard,
                  borderRadius: 12,
                  border: `1px solid ${P.bdr}`,
                  marginBottom: 8,
                  display: "flex",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt="receipt"
                    onClick={() => window.open(r.image_url, "_blank")}
                    style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${P.bdr}` }}
                  />
                ) : (
                  <div style={{ width: 54, height: 54, borderRadius: 8, background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    🧾
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: Ft.h, color: P.grn }}>
                    ${Number(r.amount).toFixed(2)}
                  </div>
                  {r.project_name && (
                    <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, fontFamily: Ft.m, color: P.red, background: P.rBg, borderRadius: 5, padding: "2px 7px", marginTop: 3, letterSpacing: ".02em" }}>
                      📁 {r.project_name}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 3 }}>
                    {fmtDateFull(r.receipt_date)}
                    {r.note && ` · ${r.note}`}
                  </div>
                  <button
                    onClick={() => openEditReceipt(r)}
                    style={{ fontSize: 11, color: P.mid, background: "none", border: "none", cursor: "pointer", marginTop: 4, fontFamily: Ft.m, padding: 0 }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setDelRcMod(r)}
                    style={{ fontSize: 11, color: P.lt, background: "none", border: "none", cursor: "pointer", marginTop: 4, marginLeft: 14, fontFamily: Ft.m, padding: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "trips" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px" }}>
              <h2
                style={{
                  fontFamily: Ft.h,
                  fontSize: 20,
                  fontWeight: 700,
                  margin: 0
                }}
              >
                My Trips
              </h2>
              <Btn
                small
                onClick={() => setMyShowRejected(r => !r)}
                color={myShowRejected ? P.red : P.blk}
              >
                {myShowRejected ? `← Active` : `✕ Rejected (${myRejectedTrips.length})`}
              </Btn>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div
                  className="mp-glow"
                  style={{ padding: "14px 16px", "--ge": P.red, "--gw": "rgba(196,30,42,.32)" }}
                >
                  <div className="mp-eyebrow">Pay Period</div>
                  <div className="mp-num mp-display" style={{ fontSize: 30, fontWeight: 700, color: P.txt, lineHeight: 1.05, marginTop: 5 }}>
                    {ppMiles.toFixed(1)}
                    <span style={{ fontSize: 13, color: P.mid, fontFamily: Ft.b, fontWeight: 600 }}> mi</span>
                  </div>
                  <div className="mp-num" style={{ fontSize: 15, color: P.grn, fontWeight: 700, marginTop: 4 }}>
                    ${(ppMiles * settings.irs_rate).toFixed(2)}
                  </div>
                </div>
                <div
                  className="mp-glow"
                  style={{ padding: "14px 16px", "--ge": P.gold, "--gw": "rgba(176,141,87,.4)" }}
                >
                  <div className="mp-eyebrow">Year to Date</div>
                  <div className="mp-num mp-display" style={{ fontSize: 30, fontWeight: 700, color: P.txt, lineHeight: 1.05, marginTop: 5 }}>
                    {ytdMiles.toFixed(1)}
                    <span style={{ fontSize: 13, color: P.mid, fontFamily: Ft.b, fontWeight: 600 }}> mi</span>
                  </div>
                  <div className="mp-num" style={{ fontSize: 15, color: P.grn, fontWeight: 700, marginTop: 4 }}>
                    ${(ytdMiles * settings.irs_rate).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 11, fontSize: 11, color: P.lt, fontFamily: Ft.m, textAlign: "center" }}>
                {settings.pay_period_frequency === "weekly" ? "Weekly" : settings.pay_period_frequency === "monthly" ? "Monthly" : "Bi-weekly"} Period: {fmtDate(pp.start)} – {fmtDate(pp.end)} · Rate: ${settings.irs_rate}/mi
              </div>
            </div>
            {(myShowRejected ? myRejectedTrips : myActiveTrips).slice(0, 50).flatMap((t, i, arr) => {
              const prev = arr[i - 1];
              const monthSep = i > 0 && t.trip_date.slice(0, 7) !== prev.trip_date.slice(0, 7);
              const dateSep = !monthSep && i > 0 && t.trip_date !== prev.trip_date;
              const card = (
                <div
                  key={t.id}
                  style={{
                    padding: "12px 14px",
                    background: P.gCard,
                    borderRadius: 12,
                    border: `1px solid ${P.bdr}`,
                    marginBottom: 8
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {t.from_project_name} → {t.to_project_name}
                      </div>
                      <div
                        style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 2 }}
                      >
                        {fmtDateFull(t.trip_date)}
                        {t.note && ` · ${t.note}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: Ft.h }}>
                        {Number(t.miles).toFixed(1)} mi
                      </div>
                      <div style={{ fontSize: 12, color: P.grn, fontFamily: Ft.m }}>
                        ${Number(t.reimbursement).toFixed(2)}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: Ft.m,
                          color:
                            t.status === "approved"
                              ? P.grn
                              : t.status === "rejected"
                              ? P.red
                              : P.amb
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                  {isA && (
                    <button
                      onClick={() => openEdit(t)}
                      style={{
                        fontSize: 11,
                        color: P.mid,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        marginTop: 6,
                        fontFamily: Ft.m,
                        padding: 0
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              );
              return monthSep
                ? [
                    <div
                      key={`mb-${t.id}`}
                      style={{ borderTop: `2px solid ${P.blk}`, margin: "20px 0 0" }}
                    />,
                    <div
                      key={`mr-${t.id}`}
                      style={{ borderTop: `2px solid ${P.red}`, margin: "0 0 16px" }}
                    />,
                    card
                  ]
                : dateSep
                ? [
                    <div
                      key={`sep-${t.id}`}
                      style={{ borderTop: `2px solid ${P.red}`, margin: "16px 0" }}
                    />,
                    card
                  ]
                : [card];
            })}
            {(myShowRejected ? myRejectedTrips : myActiveTrips).length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: P.lt,
                  fontFamily: Ft.m
                }}
              >
                {myShowRejected ? "No rejected trips" : "No trips logged yet"}
              </div>
            )}
          </div>
        )}

        {tab === "projects" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <h2
              style={{
                fontFamily: Ft.h,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 16px"
              }}
            >
              Projects
            </h2>
            {isA && (
              <Btn
                small
                onClick={() => setProjMod(true)}
                color={P.red}
                sx={{ marginBottom: 16 }}
              >
                + Add Project
              </Btn>
            )}
            {projs.map(p => (
              <div
                key={p.id}
                style={{
                  padding: "12px 16px",
                  background: P.gCard,
                  borderRadius: 12,
                  border: `1px solid ${P.bdr}`,
                  marginBottom: 8,
                  borderLeft: `3px solid ${p.address ? P.grn : P.lt}`
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {p.name}
                </div>
                {p.address && (
                  <div style={{ fontSize: 12, color: P.mid, marginTop: 4 }}>
                    {p.address}
                  </div>
                )}
                {!p.address && (
                  <div style={{ fontSize: 12, color: P.lt, marginTop: 4, fontStyle: "italic" }}>
                    No address - cannot calculate mileage
                  </div>
                )}
              </div>
            ))}
            {projs.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: P.lt,
                  fontFamily: Ft.m
                }}
              >
                No projects yet. Add one to start logging trips.
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <h2 style={{ fontFamily: Ft.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
              Profile
            </h2>
            <div className="mp-card" style={{ background: P.gCard, border: `1px solid ${P.bdr}`, borderRadius: 14, padding: 16, marginBottom: 24, display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar u={user} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: P.txt, fontFamily: Ft.h }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 12.5, color: P.lt, fontFamily: Ft.m, marginTop: 2 }}>
                  {user.email}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: Ft.m,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: P.red,
                    background: P.rBg,
                    borderRadius: 6,
                    padding: "3px 9px",
                    marginTop: 9
                  }}
                >
                  {RLBL[user.role]}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <label style={{ flex: 1, minWidth: 130, cursor: avUploading ? "default" : "pointer" }}>
                <div style={{ ...iS, textAlign: "center", color: P.mid, cursor: avUploading ? "default" : "pointer", opacity: avUploading ? 0.6 : 1 }}>
                  📷 Take Photo
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={avUploading}
                  style={{ display: "none" }}
                  onChange={e => uploadAvatar(e.target.files[0])}
                />
              </label>
              <label style={{ flex: 1, minWidth: 130, cursor: avUploading ? "default" : "pointer" }}>
                <div style={{ ...iS, textAlign: "center", color: P.mid, cursor: avUploading ? "default" : "pointer", opacity: avUploading ? 0.6 : 1 }}>
                  {avUploading ? "Uploading..." : "🖼️ Choose Photo"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={avUploading}
                  style={{ display: "none" }}
                  onChange={e => uploadAvatar(e.target.files[0])}
                />
              </label>
            </div>

            <h3 style={{ fontFamily: Ft.h, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
              Suggestions &amp; Bug Reports
            </h3>
            <p style={{ fontSize: 12.5, color: P.lt, fontFamily: Ft.b, margin: "0 0 14px", lineHeight: 1.5 }}>
              Spot a bug or have an idea to make this app better? Send it straight to the admin team.
            </p>
            <div className="mp-card" style={{ background: P.gCard, border: `1px solid ${P.bdr}`, borderRadius: 14, padding: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[{ k: "suggestion", l: "💡 Suggestion" }, { k: "bug", l: "🐞 Bug / Issue" }].map(o => (
                  <button
                    key={o.k}
                    onClick={() => setSgType(o.k)}
                    style={{
                      flex: 1,
                      padding: "9px 10px",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontFamily: Ft.b,
                      fontWeight: 700,
                      fontSize: 13,
                      border: sgType === o.k ? `1.5px solid ${P.red}` : `1.5px solid ${P.bdr}`,
                      background: sgType === o.k ? P.rBg : P.gCard,
                      color: sgType === o.k ? P.red : P.mid
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <textarea
                value={sgMsg}
                onChange={e => setSgMsg(e.target.value)}
                placeholder={sgType === "bug" ? "What happened? What did you expect instead?" : "What would make this app better for you?"}
                rows={4}
                maxLength={2000}
                style={{ ...iS, resize: "vertical", fontFamily: Ft.b }}
              />
              <div style={{ marginTop: 12 }}>
                <Btn full disabled={!sgMsg.trim() || sgSaving} onClick={submitSuggestion}>
                  {sgSaving ? "Sending..." : "Send to Admin"}
                </Btn>
              </div>
            </div>

            {mySuggestions.length > 0 && (
              <>
                <h3 style={{ fontFamily: Ft.h, fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>
                  Your Submissions
                </h3>
                {mySuggestions.map(s => (
                  <div
                    key={s.id}
                    className="mp-card"
                    style={{
                      background: P.gCard,
                      border: `1px solid ${P.bdr}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: P.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.type === "bug" ? "🐞 " : "💡 "}{s.message}
                      </div>
                      <div style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 2 }}>
                        {fmtDateFull((s.created_at || "").slice(0, 10))}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        fontFamily: Ft.m,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        flexShrink: 0,
                        color: s.resolved ? P.grn : s.cleared_at ? P.amb : P.lt
                      }}
                    >
                      {s.resolved ? "Resolved" : s.cleared_at ? "Reviewing" : "Submitted"}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "reports" && isA && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    margin: "0 0 16px"
                  }}
                >
                  Reports
                </h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {isA && (
                    <select
                      value={reportUser}
                      onChange={e => setReportUser(e.target.value)}
                      style={{ ...iS, width: "auto", flex: 1 }}
                    >
                      <option value="all">All Employees</option>
                      {users
                        .filter(u => u.active)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <select
                    value={reportPeriod}
                    onChange={e => setReportPeriod(e.target.value)}
                    style={{ ...iS, width: "auto", flex: 1 }}
                  >
                    <option value="current">Pay Period</option>
                    <option value="monthly">Monthly Mileage</option>
                    <option value="ytd">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
                  {reportPeriod === "current" && (
                    <select
                      value={payPeriodOffset}
                      onChange={e => setPayPeriodOffset(Number(e.target.value))}
                      style={{ ...iS, width: "auto", flex: 1 }}
                    >
                      {ppList.map(p => (
                        <option key={p.offset} value={p.offset}>
                          {fmtDate(p.start)} - {fmtDate(p.end)}{p.offset === 0 ? " (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {reportPeriod === "monthly" && (
                    <input
                      type="month"
                      value={reportMonth}
                      onChange={e => setReportMonth(e.target.value)}
                      style={{ ...iS, width: "auto", flex: 1 }}
                    />
                  )}
                </div>
                <div
                  style={{
                    background: P.gCard,
                    borderRadius: 12,
                    padding: 16,
                    border: `1px solid ${P.bdr}`,
                    borderLeft: `3px solid ${P.red}`,
                    marginBottom: 16
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: Ft.m,
                          color: P.lt,
                          textTransform: "uppercase"
                        }}
                      >
                        Total Miles
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: Ft.h }}>
                        {reportMiles.toFixed(1)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: Ft.m,
                          color: P.lt,
                          textTransform: "uppercase"
                        }}
                      >
                        Reimbursement
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          fontFamily: Ft.h,
                          color: P.grn
                        }}
                      >
                        ${reportReimb.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 8 }}>
                    {reportTrips.length} trips
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 16, flexWrap: "wrap" }} className="no-print">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      small
                      onClick={exportCSV}
                      color={P.tan}
                    >
                      📥 Export CSV
                    </Btn>
                    <Btn
                      small
                      onClick={() => setShowRejected(r => !r)}
                      color={showRejected ? P.red : P.blk}
                    >
                      {showRejected ? `← Active` : `✕ Rejected (${rejectedTrips.length})`}
                    </Btn>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      small
                      onClick={() => setEmailMod(true)}
                      color={P.blk}
                    >
                      ✉️ Email Report
                    </Btn>
                    <Btn
                      small
                      onClick={printReport}
                      color={P.red}
                    >
                      🖨️ Print
                    </Btn>
                    {reportReceipts.length > 0 && (
                      <Btn
                        small
                        onClick={() => printReceipts(reportReceipts, reportUser === "all" ? "All employees" : users.find(u => u.id === reportUser)?.name)}
                        color={P.grn}
                      >
                        🧾 Print Receipts ({reportReceipts.length})
                      </Btn>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: `2px solid ${P.red}`, margin: "16px 0" }} />
                {reportTrips.slice(0, 100).flatMap((t, i, arr) => {
                  const prev = arr[i - 1];
                  const userSep = i > 0 && t.user_name !== prev.user_name;
                  const monthSep = !userSep && i > 0 && (reportPeriod === "ytd" || reportPeriod === "all") && t.trip_date.slice(0, 7) !== prev.trip_date.slice(0, 7);
                  const card = (
                    <div
                      key={t.id}
                      style={{
                        padding: "12px 14px",
                        background: P.gCard,
                        borderRadius: 12,
                        border: `1px solid ${P.bdr}`,
                        marginBottom: 8
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: P.red }}>
                            {t.user_name}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {t.from_project_name} → {t.to_project_name}
                          </div>
                          <div
                            style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 2 }}
                          >
                            {fmtDateFull(t.trip_date)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: Ft.h }}>
                            {Number(t.miles).toFixed(1)} mi
                          </div>
                          <div style={{ fontSize: 12, color: P.grn, fontFamily: Ft.m }}>
                            ${Number(t.reimbursement).toFixed(2)}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: Ft.m,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background:
                                t.status === "approved"
                                  ? P.gBg
                                  : t.status === "rejected"
                                  ? P.rBg
                                  : P.aBg,
                              color:
                                t.status === "approved"
                                  ? P.grn
                                  : t.status === "rejected"
                                  ? P.red
                                  : P.amb
                            }}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                      {isA && t.status === "logged" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }} className="no-print">
                          <Btn
                            small
                            color={P.grn}
                            onClick={() => approveTrip(t.id)}
                            sx={{ flex: 1 }}
                          >
                            ✓ Approve
                          </Btn>
                          <Btn
                            small
                            color={P.red}
                            onClick={() => rejectTrip(t.id)}
                            sx={{ flex: 1 }}
                          >
                            ✕ Reject
                          </Btn>
                        </div>
                      )}
                      {isA && (
                        <div style={{ display: "flex", gap: 14, marginTop: 6 }} className="no-print">
                          <button
                            onClick={() => openEdit(t)}
                            style={{
                              fontSize: 11,
                              color: P.mid,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: Ft.m,
                              padding: 0
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setDTM(t)}
                            style={{
                              fontSize: 11,
                              color: P.lt,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: Ft.m,
                              padding: 0
                            }}
                          >
                            Delete trip
                          </button>
                        </div>
                      )}
                    </div>
                  );
                  const next = arr[i + 1];
                  const endOfUser = !next || next.user_name !== t.user_name;
                  const ut = userTotals[t.user_name];
                  const urt = userReceiptTotals[t.user_name];
                  const hasRc = urt && urt.count > 0 && !showRejected;
                  const grand = (ut ? ut.reimb : 0) + (hasRc ? urt.amount : 0);
                  const totalBox = endOfUser && ut ? (
                    <div
                      key={`tot-${t.id}`}
                      className="mp-glow"
                      style={{
                        marginTop: 10,
                        marginBottom: 16,
                        padding: "16px 18px",
                        "--ge": P.red,
                        "--gw": "rgba(196,30,42,.30)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            flexShrink: 0,
                            background: P.blk,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: Ft.h,
                            fontWeight: 700,
                            fontSize: 19,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 3px 8px rgba(58,42,28,.22)"
                          }}
                        >
                          {(t.user_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 3 }}>
                            <span style={{ fontFamily: Ft.h, fontWeight: 700, fontSize: 16, color: P.txt, letterSpacing: "-.01em" }}>
                              {t.user_name}
                            </span>
                            <span style={{ fontFamily: Ft.m, fontSize: 9, fontWeight: 700, color: P.lt, textTransform: "uppercase", letterSpacing: ".12em" }}>
                              Total
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: P.mid, fontFamily: Ft.m }}>
                            {ut.count} trip{ut.count === 1 ? "" : "s"} · {ut.miles.toFixed(1)} mi
                            {hasRc ? ` · ${urt.count} receipt${urt.count === 1 ? "" : "s"}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className="mp-num mp-display" style={{ fontSize: 27, fontWeight: 700, color: P.txt, lineHeight: 1 }}>
                            ${grand.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 9.5, fontFamily: Ft.m, color: P.lt, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>
                            {hasRc ? "Total Owed" : "Reimbursement"}
                          </div>
                        </div>
                      </div>
                      {hasRc && (
                        <div style={{ display: "flex", gap: 14, marginTop: 13, paddingTop: 13, borderTop: `1px solid ${P.bdr}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9.5, fontFamily: Ft.m, color: P.lt, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                              Mileage
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: Ft.m, color: P.grn }}>
                              ${ut.reimb.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9.5, fontFamily: Ft.m, color: P.lt, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                              Receipts
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: Ft.m, color: P.grn }}>
                              ${urt.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
                  const tail = totalBox ? [card, totalBox] : [card];
                  return userSep
                    ? [
                        <div
                          key={`us-${t.id}`}
                          style={{ borderTop: `2px solid ${P.red}`, margin: "16px 0" }}
                        />,
                        ...tail
                      ]
                    : monthSep
                    ? [
                        <div
                          key={`mb-${t.id}`}
                          style={{ borderTop: `2px solid ${P.blk}`, margin: "20px 0 0" }}
                        />,
                        <div
                          key={`mr-${t.id}`}
                          style={{ borderTop: `2px solid ${P.red}`, margin: "0 0 16px" }}
                        />,
                        ...tail
                      ]
                    : tail;
                })}
                {reportTrips.length === 0 && (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: P.lt,
                      fontFamily: Ft.m
                    }}
                  >
                    No trips in this period
                  </div>
                )}
              </>
          </div>
        )}

        {tab === "admin" && isA && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {adPg === "hub" && (
              <div>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    margin: "0 0 20px"
                  }}
                >
                  Admin
                </h2>
                {[
                  {
                    k: "employees",
                    l: "Employees",
                    d: "Manage team members",
                    c: P.red
                  },
                  {
                    k: "suggestions",
                    l: "Suggestions & Bugs",
                    d: pendingSgCount > 0 ? `${pendingSgCount} new — needs review` : "Review feedback from the team",
                    c: P.red
                  },
                  {
                    k: "settings",
                    l: "Settings",
                    d: "IRS rate & pay periods",
                    c: P.tan
                  },
                  {
                    k: "share",
                    l: "Share App",
                    d: "Send app link via SMS",
                    c: P.blk
                  }
                ].map(p => (
                  <button
                    key={p.k}
                    onClick={() => p.k === "share" ? setShareMod(true) : setAdPg(p.k)}
                    className="mp-glow"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 20px",
                      marginBottom: 12,
                      cursor: "pointer",
                      fontFamily: Ft.b,
                      "--ge": p.c,
                      "--gw": "rgba(58,42,28,.16)"
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.l}</div>
                    <div style={{ fontSize: 13, color: P.lt, marginTop: 4 }}>{p.d}</div>
                  </button>
                ))}
              </div>
            )}

            {adPg === "employees" && (
              <div>
                <button
                  onClick={() => setAdPg("hub")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: P.red,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 16,
                    fontFamily: Ft.b
                  }}
                >
                  ← Admin
                </button>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    margin: "0 0 16px"
                  }}
                >
                  Employees
                </h2>
                {users.map(u => {
                  const canE =
                    ROLES[user.role] > ROLES[u.role] || user.role === "super_admin";
                  const self = u.id === user.id;
                  return (
                    <div
                      key={u.id}
                      style={{
                        padding: "12px 16px",
                        background: P.gCard,
                        borderRadius: 12,
                        border: `1px solid ${P.bdr}`,
                        marginBottom: 8,
                        borderLeft: `3px solid ${u.active ? P.grn : P.lt}`
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start"
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 15,
                              color: u.active ? P.txt : P.lt
                            }}
                          >
                            {u.name}{" "}
                            {self && (
                              <span style={{ fontSize: 11, color: P.lt }}>(you)</span>
                            )}
                          </div>
                          <div
                            style={{ fontSize: 11, fontFamily: Ft.m, color: P.lt }}
                          >
                            {u.email} ·{" "}
                            <span style={{ color: P.red }}>{RLBL[u.role]}</span>
                          </div>
                        </div>
                        {canE && !self && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              alignItems: "flex-end"
                            }}
                          >
                            <button
                              onClick={() => {
                                setEU(u.id);
                                setEUN(u.name);
                                setEUE(u.email);
                              }}
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${P.bdr}`,
                                background: P.gCard,
                                color: P.mid,
                                cursor: "pointer",
                                fontFamily: Ft.m
                              }}
                            >
                              Edit
                            </button>
                            <select
                              value={u.role}
                              onChange={e => chRole(u.id, e.target.value)}
                              style={{
                                fontSize: 11,
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: `1px solid ${P.bdr}`,
                                fontFamily: Ft.m
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              {isS && <option value="senior_admin">Sr Admin</option>}
                            </select>
                            <button
                              onClick={() => togUser(u.id, u.active)}
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: u.active ? P.rBg : P.gBg,
                                color: u.active ? P.red : P.grn,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: Ft.m
                              }}
                            >
                              {u.active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setDUM(u.id)}
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: P.red,
                                color: "#fff",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: Ft.m
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {adPg === "suggestions" && (
              <div>
                <button
                  onClick={() => setAdPg("hub")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: P.red,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 16,
                    fontFamily: Ft.b
                  }}
                >
                  ← Admin
                </button>
                <h2 style={{ fontFamily: Ft.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
                  Suggestions &amp; Bug Reports
                </h2>
                {suggestions.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: P.lt, fontFamily: Ft.m }}>
                    Nothing submitted yet
                  </div>
                )}
                {suggestions
                  .slice()
                  .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                  .map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSgDetail(s)}
                      className="mp-glow"
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "14px 16px",
                        marginBottom: 10,
                        cursor: "pointer",
                        fontFamily: Ft.b,
                        "--ge": s.type === "bug" ? P.red : P.tan,
                        "--gw": "rgba(58,42,28,.16)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: Ft.m,
                                textTransform: "uppercase",
                                letterSpacing: ".06em",
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: s.type === "bug" ? P.rBg : P.tBg,
                                color: s.type === "bug" ? P.red : P.tanDeep
                              }}
                            >
                              {s.type === "bug" ? "🐞 Bug" : "💡 Suggestion"}
                            </span>
                            {!s.cleared_at && (
                              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: Ft.m, color: P.red }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: P.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.message}
                          </div>
                          <div style={{ fontSize: 11, color: P.lt, fontFamily: Ft.m, marginTop: 3 }}>
                            {s.user_name} · {fmtDateFull((s.created_at || "").slice(0, 10))}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, fontSize: 11, fontFamily: Ft.m, fontWeight: 700, color: s.resolved ? P.grn : P.amb }}>
                          {s.resolved ? "✓ Resolved" : "Open"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {adPg === "settings" && (
              <div>
                <button
                  onClick={() => setAdPg("hub")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: P.red,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 16,
                    fontFamily: Ft.b
                  }}
                >
                  ← Admin
                </button>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    margin: "0 0 16px"
                  }}
                >
                  Settings
                </h2>
                <div
                  style={{
                    background: P.gCard,
                    borderRadius: 14,
                    border: `1px solid ${P.bdr}`,
                    padding: 16,
                    marginBottom: 16,
                    borderTop: `3px solid ${P.red}`
                  }}
                >
                  <h3
                    style={{ fontSize: 13, fontFamily: Ft.m, margin: "0 0 12px" }}
                  >
                    MILEAGE RATE
                  </h3>
                  <Fl label="IRS Rate ($/mile)">
                    <input
                      style={iS}
                      type="number"
                      step="0.01"
                      value={settingsRate}
                      onChange={e => setSettingsRate(e.target.value)}
                    />
                  </Fl>
                  <div
                    style={{
                      fontSize: 12,
                      color: P.lt,
                      fontFamily: Ft.m,
                      marginBottom: 12
                    }}
                  >
                    Current IRS rate for 2026: $0.70/mile. Update when IRS announces
                    new rate.
                  </div>
                </div>
                <div
                  style={{
                    background: P.gCard,
                    borderRadius: 14,
                    border: `1px solid ${P.bdr}`,
                    padding: 16,
                    marginBottom: 16,
                    borderTop: `3px solid ${P.tan}`
                  }}
                >
                  <h3
                    style={{ fontSize: 13, fontFamily: Ft.m, margin: "0 0 12px" }}
                  >
                    PAY PERIOD
                  </h3>
                  <Fl label="Pay Period Frequency">
                    <select
                      style={iS}
                      value={settingsFreq}
                      onChange={e => setSettingsFreq(e.target.value)}
                    >
                      <option value="weekly">Weekly (7 days)</option>
                      <option value="biweekly">Bi-weekly (14 days)</option>
                      <option value="monthly">Monthly (30 days)</option>
                    </select>
                  </Fl>
                  <Fl label="Pay Period Start Date (anchor date)">
                    <input
                      style={iS}
                      type="date"
                      value={settingsAnchor}
                      onChange={e => setSettingsAnchor(e.target.value)}
                    />
                  </Fl>
                  <Fl label="Pay Period Start Time (Mountain Time)">
                    <input
                      style={iS}
                      type="time"
                      value={settingsTime}
                      onChange={e => setSettingsTime(e.target.value)}
                    />
                  </Fl>
                  <div
                    style={{
                      fontSize: 12,
                      color: P.lt,
                      fontFamily: Ft.m,
                      marginBottom: 12
                    }}
                  >
                    Set when pay periods start. Default is 12:00 PM MT on the anchor date. 
                    The app calculates all periods from this date/time based on your selected frequency.
                  </div>
                </div>
                <Btn full onClick={saveSettings}>
                  Save Settings
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={projMod} onClose={() => setProjMod(false)} title="Add Project">
        <Fl label="Project Name">
          <input
            style={iS}
            value={nPN}
            onChange={e => setNPN(e.target.value)}
            placeholder="e.g. Henderson Patio"
          />
        </Fl>
        <Fl label="Address (required for mileage)">
          <input
            style={iS}
            value={nPA}
            onChange={e => setNPA(e.target.value)}
            placeholder="4521 Elm St, Denver, CO"
          />
        </Fl>
        <div
          style={{
            fontSize: 12,
            color: P.amb,
            marginBottom: 12,
            fontFamily: Ft.m
          }}
        >
          Full address with city/state needed for accurate mileage calculation.
        </div>
        <Btn full disabled={!nPN.trim() || !nPA.trim()} onClick={saveProj}>
          Add Project
        </Btn>
      </Modal>

      <Modal open={manualMod} onClose={() => setManualMod(false)} title="Manual Entry">
        <div style={{ fontSize: 14, color: P.mid, marginBottom: 16 }}>
          Auto-calculation failed. Enter mileage manually:
        </div>
        <Fl label="Miles">
          <input
            style={{...iS, textAlign: "center", fontSize: 20, fontFamily: Ft.h}}
            type="number"
            step="0.1"
            value={manualMiles}
            onChange={e => setManualMiles(e.target.value)}
            placeholder="0.0"
            autoFocus
          />
        </Fl>
        {manualMiles && (
          <div style={{ fontSize: 13, color: P.grn, marginBottom: 12, textAlign: "center", fontFamily: Ft.m }}>
            Reimbursement: ${(parseFloat(manualMiles) * settings.irs_rate).toFixed(2)}
          </div>
        )}
        <Btn full disabled={!manualMiles || parseFloat(manualMiles) <= 0} onClick={saveManualTrip}>
          Log Trip
        </Btn>
      </Modal>

      <Modal open={editMod} onClose={() => setEditMod(false)} title="Edit Trip">
        <Fl label="From">
          <select
            style={{ ...iS, appearance: "none" }}
            value={edFr}
            onChange={e => setEdFr(e.target.value)}
          >
            <option value="">Select starting project...</option>
            {projs.filter(p => p.address).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Fl>
        <Fl label="To">
          <select
            style={{ ...iS, appearance: "none" }}
            value={edTo}
            onChange={e => setEdTo(e.target.value)}
          >
            <option value="">Select destination project...</option>
            {projs.filter(p => p.address && p.id !== edFr).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Fl>
        {isA && (
          <Fl label="Trip Date (Admin Only)">
            <input
              style={iS}
              type="date"
              value={edDt}
              onChange={e => setEdDt(e.target.value)}
            />
          </Fl>
        )}
        <Fl label="Note">
          <input
            style={iS}
            value={edNt}
            onChange={e => setEdNt(e.target.value)}
            placeholder="optional"
          />
        </Fl>
        <Btn full disabled={!edFr || !edTo || calculating} onClick={saveEdit}>
          {calculating ? "Recalculating..." : "Save Changes"}
        </Btn>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEU(null)} title="Edit Employee">
        <Fl label="Name">
          <input style={iS} value={euN} onChange={e => setEUN(e.target.value)} />
        </Fl>
        <Fl label="Email (login)">
          <input
            style={{ ...iS, background: P.bg, color: P.lt, cursor: "not-allowed" }}
            type="email"
            value={euE}
            readOnly
          />
        </Fl>
        <p style={{ fontSize: 11, color: P.lt, margin: "-6px 0 16px", fontFamily: Ft.m }}>
          Login email & password are managed by the employee from their own
          account (🔑 Change Password). Set their role and active status from the
          employee list.
        </p>
        <Btn full disabled={!euN.trim()} onClick={saveEU}>
          Save
        </Btn>
      </Modal>

      <Modal
        open={!!delTripMod}
        onClose={() => setDTM(null)}
        title="Delete Trip?"
      >
        <p style={{ color: P.mid, marginBottom: 20 }}>
          Permanently delete{" "}
          <strong>{delTripMod?.from_project_name} → {delTripMod?.to_project_name}</strong>
          {" "}({Number(delTripMod?.miles || 0).toFixed(1)} mi) on {delTripMod && fmtDateFull(delTripMod.trip_date)}? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setDTM(null)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: `1.5px solid ${P.bdr}`,
              background: P.gCard,
              color: P.mid,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <Btn full color={P.red} onClick={async () => { await deleteTrip(delTripMod.id); setDTM(null); }} sx={{ flex: 1 }}>
            Delete
          </Btn>
        </div>
      </Modal>

      <Modal
        open={!!delUserMod}
        onClose={() => setDUM(null)}
        title="Delete Employee?"
      >
        <p style={{ color: P.mid, marginBottom: 20 }}>
          This will permanently remove{" "}
          <strong>{users.find(u => u.id === delUserMod)?.name}</strong>. This cannot
          be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setDUM(null)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: `1.5px solid ${P.bdr}`,
              background: P.gCard,
              color: P.mid,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <Btn full color={P.red} onClick={() => delUser(delUserMod)} sx={{ flex: 1 }}>
            Delete
          </Btn>
        </div>
      </Modal>

      <Modal
        open={emailMod}
        onClose={() => setEmailMod(false)}
        title="Email Report"
      >
        <Fl label="Recipient Email">
          <input
            style={iS}
            type="email"
            value={emailTo}
            onChange={e => setEmailTo(e.target.value)}
            placeholder="recipient@email.com"
          />
        </Fl>
        <div style={{ fontSize: 12, color: P.lt, marginBottom: 16, fontFamily: Ft.m }}>
          Opens your default email client with report attached as CSV data.
        </div>
        <Btn full disabled={!emailTo.trim()} onClick={emailReport}>
          Send Email
        </Btn>
      </Modal>

      <Modal open={pwMod} onClose={() => { setPwMod(false); setNewPw(""); setNewPw2(""); setPwErr(""); }} title="Change Password">
        <Fl label="New Password">
          <input style={iS} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
        </Fl>
        <Fl label="Confirm New Password">
          <input style={iS} type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} placeholder="Re-enter new password" onKeyDown={e => { if (e.key === "Enter") changePassword(); }} />
        </Fl>
        {pwErr && <div style={{ color: P.red, fontSize: 13, marginBottom: 12, fontFamily: Ft.m }}>{pwErr}</div>}
        <Btn full disabled={pwSaving} onClick={changePassword}>{pwSaving ? "Saving..." : "Update Password"}</Btn>
      </Modal>

      <Modal open={shareMod} onClose={() => setShareMod(false)} title="Share App">
        <div style={{ fontSize: 13, color: P.mid, marginBottom: 12, fontFamily: Ft.m }}>
          Enter phone numbers (one per line, or comma-separated):
        </div>
        <Fl label="Phone Numbers">
          <textarea
            style={{ ...iS, minHeight: 110, fontFamily: Ft.m, resize: "vertical" }}
            value={sharePhones}
            onChange={e => setSharePhones(e.target.value)}
            placeholder={"555-123-4567\n555-987-6543"}
          />
        </Fl>
        <div style={{ fontSize: 12, color: P.lt, marginBottom: 16, fontFamily: Ft.m }}>
          Opens your messages app with the app link prefilled. Numbers must be 10+ digits.
        </div>
        <Btn full disabled={!sharePhones.trim()} onClick={shareApp}>
          Send via SMS
        </Btn>
      </Modal>

      <Modal open={rcMod} onClose={() => { setRcMod(false); setEditRc(null); }} title={editRc ? "Edit Receipt" : "Add Receipt"}>
        {isA && (
          <Fl label="Receipt For">
            <select
              style={{ ...iS, appearance: "none" }}
              value={rcForUser || user.id}
              onChange={e => setRcForUser(e.target.value === user.id ? "" : e.target.value)}
            >
              <option value={user.id}>{user.name} (me)</option>
              {users.filter(u => u.active && u.id !== user.id).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Fl>
        )}
        <Fl label="Project">
          <select
            style={{ ...iS, appearance: "none" }}
            value={rcProj}
            onChange={e => setRcProj(e.target.value)}
          >
            <option value="">— No project —</option>
            {projs.filter(p => p.active !== false && !p.is_supplier).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Fl>
        <Fl label="Photo">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 130, cursor: "pointer" }}>
              <div style={{ ...iS, textAlign: "center", color: P.mid, cursor: "pointer" }}>
                📷 Camera
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={e => pickReceiptFile(e.target.files[0])}
              />
            </label>
            <label style={{ flex: 1, minWidth: 130, cursor: "pointer" }}>
              <div style={{ ...iS, textAlign: "center", color: P.mid, cursor: "pointer" }}>
                🖼️ Gallery / Files
              </div>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => pickReceiptFile(e.target.files[0])}
              />
            </label>
          </div>
          {rcPreview && (
            <img src={rcPreview} alt="preview" style={{ marginTop: 10, width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 10, border: `1px solid ${P.bdr}` }} />
          )}
        </Fl>
        <Fl label="Amount ($)">
          <input
            style={iS}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={rcAmt}
            onChange={e => setRcAmt(e.target.value)}
            placeholder="0.00"
          />
        </Fl>
        <Fl label="Receipt Date">
          <input style={iS} type="date" value={rcDate} onChange={e => setRcDate(e.target.value)} />
        </Fl>
        <Fl label="Note">
          <input style={iS} value={rcNote} onChange={e => setRcNote(e.target.value)} placeholder="optional" />
        </Fl>
        <Btn full disabled={!rcAmt || rcUp} onClick={saveReceipt}>
          {rcUp ? "Saving..." : editRc ? "Save Changes" : "Save Receipt"}
        </Btn>
      </Modal>

      <Modal open={!!delRcMod} onClose={() => setDelRcMod(null)} title="Delete Receipt?">
        <p style={{ color: P.mid, marginBottom: 20 }}>
          Permanently delete this <strong>${Number(delRcMod?.amount || 0).toFixed(2)}</strong> receipt from {delRcMod && fmtDateFull(delRcMod.receipt_date)}? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setDelRcMod(null)}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bdr}`, background: P.gCard, color: P.mid, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <Btn full color={P.red} onClick={() => deleteReceipt(delRcMod.id)} sx={{ flex: 1 }}>
            Delete
          </Btn>
        </div>
      </Modal>

      <Modal
        open={!!sgPopup}
        onClose={() => setSgPopup(null)}
        accent
        title={sgPopup?.type === "bug" ? "🐞 Bug Report Waiting" : "💡 New Suggestion"}
      >
        {sgPopup && (
          <>
            <div
              style={{
                fontSize: 15,
                color: P.txt,
                lineHeight: 1.5,
                marginBottom: 14,
                background: P.bg,
                borderRadius: 10,
                padding: "12px 14px",
                border: `1px solid ${P.bdrL}`
              }}
            >
              {sgPopup.message}
            </div>
            <div style={{ fontSize: 12, color: P.lt, fontFamily: Ft.m, marginBottom: 20 }}>
              From {sgPopup.user_name} · {fmtDateFull((sgPopup.created_at || "").slice(0, 10))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSgPopup(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bdr}`, background: P.gCard, color: P.mid, fontWeight: 600, cursor: "pointer" }}
              >
                Later
              </button>
              <Btn full sx={{ flex: 1 }} onClick={() => clearSuggestion(sgPopup.id)}>
                Clear — I've Seen This
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!sgDetail}
        onClose={() => setSgDetail(null)}
        accent
        title={sgDetail?.type === "bug" ? "🐞 Bug Report" : "💡 Suggestion"}
      >
        {sgDetail && (
          <>
            <div
              style={{
                fontSize: 15,
                color: P.txt,
                lineHeight: 1.5,
                marginBottom: 16,
                background: P.bg,
                borderRadius: 10,
                padding: "12px 14px",
                border: `1px solid ${P.bdrL}`
              }}
            >
              {sgDetail.message}
            </div>
            <div style={{ fontSize: 12.5, color: P.mid, fontFamily: Ft.m, lineHeight: 2 }}>
              <div><b style={{ color: P.txt }}>From:</b> {sgDetail.user_name}</div>
              <div><b style={{ color: P.txt }}>Submitted:</b> {fmtDateFull((sgDetail.created_at || "").slice(0, 10))}</div>
              <div>
                <b style={{ color: P.txt }}>Cleared by:</b>{" "}
                {sgDetail.cleared_by_name
                  ? `${sgDetail.cleared_by_name} · ${fmtDateFull((sgDetail.cleared_at || "").slice(0, 10))}`
                  : "Not yet cleared"}
              </div>
              <div>
                <b style={{ color: P.txt }}>Outcome:</b>{" "}
                {sgDetail.resolved
                  ? `Resolved · ${fmtDateFull((sgDetail.resolved_at || "").slice(0, 10))}${sgDetail.resolved_by_name ? " by " + sgDetail.resolved_by_name : ""}`
                  : "Not resolved yet"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {!sgDetail.cleared_at && (
                <Btn full sx={{ flex: 1 }} onClick={() => clearSuggestion(sgDetail.id)}>
                  Clear
                </Btn>
              )}
              <button
                onClick={() => resolveSuggestion(sgDetail.id, !sgDetail.resolved)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: Ft.b,
                  background: sgDetail.resolved ? P.rBg : P.gBg,
                  color: sgDetail.resolved ? P.red : P.grn
                }}
              >
                {sgDetail.resolved ? "Mark Not Complete" : "Mark Complete"}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Nav
        tab={tab}
        set={t => {
          setTab(t);
          if (t !== "admin") setAdPg("hub");
        }}
        admin={isA}
      />
      <Toast m={toast.m} s={toast.s} />
    </div>
  );
}

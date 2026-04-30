import { useState, useEffect, useCallback } from "react";

const SB = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

async function api(path, opts = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H, ...opts });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${txt}`);
  return txt ? JSON.parse(txt) : [];
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

async function getDrivingMiles(from, to) {
  try {
    const a = await geocode(from);
    if (!a) throw new Error(`Could not geocode: ${from}`);
    await new Promise(r => setTimeout(r, 300));
    const b = await geocode(to);
    if (!b) throw new Error(`Could not geocode: ${to}`);
    await new Promise(r => setTimeout(r, 300));
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`
    );
    if (!r.ok) throw new Error(`Routing failed: ${r.status}`);
    const d = await r.json();
    if (d.code !== "Ok" || !d.routes || d.routes.length === 0)
      throw new Error(`No route found: ${d.code || "unknown error"}`);
    return Math.round(d.routes[0].distance * 0.000621371 * 10) / 10;
  } catch (e) {
    console.error("Mileage calculation error:", e);
    return null;
  }
}

function getPayPeriod(date, anchor, freq = "biweekly", time = "12:00", tz = "America/Denver") {
  const [hh, mm] = time.split(":").map(Number);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
  const nH = +p.hour === 24 ? 0 : +p.hour;
  const [aY, aM, aD] = anchor.split("-").map(Number);
  const aMin = Date.UTC(aY, aM - 1, aD, hh, mm) / 60000;
  const nMin = Date.UTC(+p.year, +p.month - 1, +p.day, nH, +p.minute) / 60000;
  const pd = freq === "weekly" ? 7 : freq === "monthly" ? 30 : 14;
  const pm = pd * 1440;
  const idx = Math.floor((nMin - aMin) / pm);
  const sMin = aMin + idx * pm;
  const eMin = sMin + pm - 1440;
  const fmt2 = m => {
    const d = new Date(m * 60000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };
  return { start: fmt2(sMin), end: fmt2(eMin) };
}

function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function fmtDateFull(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function thisYear() {
  return new Date().getFullYear();
}

const ROLES = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RLBL = {
  super_admin: "Owner",
  senior_admin: "Senior Admin",
  admin: "Admin",
  user: "User"
};

const P = {
  bg: "#faf8f5",
  card: "#fff",
  bdr: "#e5e0d8",
  bdrL: "#f0ece6",
  txt: "#1a1a1a",
  mid: "#6b6560",
  lt: "#9c9590",
  red: "#c41e2a",
  rBg: "rgba(196,30,42,0.06)",
  tan: "#c4b59a",
  tBg: "rgba(196,181,154,0.12)",
  blk: "#1a1a1a",
  grn: "#16a34a",
  gBg: "rgba(22,163,74,0.08)",
  amb: "#d97706",
  aBg: "rgba(217,119,6,0.08)",
  blue: "#2563eb",
  bBg: "rgba(37,99,235,0.06)"
};

const Ft = {
  h: "'Bitter',serif",
  b: "'Source Sans 3',sans-serif",
  m: "'IBM Plex Mono',monospace"
};

const iS = {
  width: "100%",
  padding: "12px 14px",
  background: "#fff",
  border: `1.5px solid ${P.bdr}`,
  borderRadius: 10,
  color: P.txt,
  fontSize: 15,
  fontFamily: Ft.b,
  outline: "none",
  boxSizing: "border-box"
};

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="38" height="38" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="#fff"
          stroke={P.bdr}
          strokeWidth="1.5"
        />
        <path
          d="M30 78 C30 78,28 55,32 40 C36 25,38 20,36 15"
          fill="none"
          stroke={P.tan}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M38 78 C38 78,36 50,42 35 C48 20,50 14,47 8"
          fill="none"
          stroke={P.red}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M44 80 L44 30 L58 55 L72 22 L72 80"
          fill="none"
          stroke={P.blk}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <div
          style={{
            fontFamily: Ft.h,
            fontSize: 15,
            fontWeight: 700,
            color: P.txt,
            lineHeight: 1.1
          }}
        >
          Masterpiece
        </div>
        <div
          style={{
            fontSize: 8,
            fontFamily: Ft.m,
            color: P.red,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase"
          }}
        >
          Mileage Tracker
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
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
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)"
        }}
      />
      <div
        style={{
          position: "relative",
          background: P.card,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "20px 20px 32px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          animation: "slideUp .3s ease"
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: P.bdr,
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
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: Ft.h }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: P.lt,
              cursor: "pointer",
              padding: 4,
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
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: small ? "8px 14px" : "12px 20px",
        borderRadius: 10,
        border: "none",
        background: color,
        color: "#fff",
        fontSize: small ? 13 : 15,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        fontFamily: Ft.b,
        opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : "auto",
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
        background: P.red,
        color: "#fff",
        padding: "12px 22px",
        borderRadius: 12,
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
  const ts = [
    { k: "log", l: "Log Trip" },
    { k: "trips", l: "My Trips" },
    { k: "projects", l: "Projects" }
  ];
  if (admin) {
    ts.push({ k: "reports", l: "Reports" });
    ts.push({ k: "admin", l: "Admin" });
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        background: "#fff",
        borderTop: `2px solid ${P.tan}`,
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 env(safe-area-inset-bottom,8px)"
      }}
    >
      {ts.map(t => (
        <button
          key={t.k}
          onClick={() => set(t.k)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "4px 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === t.k ? P.red : P.lt,
            borderTop:
              tab === t.k ? `2px solid ${P.red}` : "2px solid transparent",
            marginTop: -2,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: Ft.m
          }}
        >
          {t.l}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [aName, setAN] = useState("");
  const [aPin, setAP] = useState("");
  const [aEmail, setAE] = useState("");
  const [aErr, setAErr] = useState("");
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
  const [euP, setEUP] = useState("");
  const [delUserMod, setDUM] = useState(null);
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

  const show = useCallback(m => {
    setToast({ m, s: true });
    setTimeout(() => setToast(t => ({ ...t, s: false })), 2800);
  }, []);

  const isA = user && ROLES[user.role] >= 2;
  const isS = user && ROLES[user.role] >= 3;

  const load = useCallback(async () => {
    try {
      const [p, t, s, u] = await Promise.all([
        api("projects?order=name"),
        api("trips?order=created_at.desc"),
        api("mileage_settings?limit=1"),
        api("yard_users?order=name")
      ]);
      setProjs(p);
      setTrips(t.map(x => ({ ...x, trip_date: typeof x.trip_date === "string" ? x.trip_date.slice(0, 10) : x.trip_date })));
      setUsr(u);
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

  const login = async () => {
    setAErr("");
    if (!aName.trim() || aPin.length !== 4) {
      setAErr("Enter name and 4-digit PIN.");
      return;
    }
    try {
      const all = await api("yard_users?active=eq.true");
      const found = all.find(
        u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin
      );
      if (!found) {
        setAErr("Name or PIN not found.");
        return;
      }
      setUser(found);
      show(`Welcome back, ${found.name}!`);
    } catch (e) {
      setAErr("Connection error.");
    }
  };

  const signup = async () => {
    setAErr("");
    if (!aName.trim() || !aEmail.trim() || aPin.length !== 4) {
      setAErr("Fill all fields.");
      return;
    }
    try {
      const ex = await api(
        `yard_users?email=eq.${encodeURIComponent(aEmail.toLowerCase().trim())}`
      );
      if (ex && ex.length > 0) {
        setAErr("Email registered. Log in.");
        return;
      }
      const res = await api("yard_users", {
        method: "POST",
        body: JSON.stringify({
          email: aEmail.toLowerCase().trim(),
          name: aName.trim(),
          pin: aPin,
          role: "user"
        })
      });
      if (res && res[0]) {
        setUser(res[0]);
        show(`Welcome, ${res[0].name}!`);
      }
    } catch (e) {
      setAErr("Signup failed.");
    }
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
    setCalc(true);
    try {
      let miles = await getDrivingMiles(fromP.address, toP.address);
      if (!miles) {
        setCalc(false);
        setManualMod(true);
        return;
      }
      const reimb = Math.round(miles * settings.irs_rate * 100) / 100;
      await api("trips", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.name,
          from_project_id: fromP.id,
          from_project_name: fromP.name,
          from_address: fromP.address,
          to_project_id: toP.id,
          to_project_name: toP.name,
          to_address: toP.address,
          miles,
          reimbursement: reimb,
          irs_rate: settings.irs_rate,
          note: tripNote,
          trip_date: tripDate
        })
      });
      await load();
      setFromId(toId);
      setToId("");
      setTripNote("");
      setTripDate(today());
      show(`${miles} mi logged — $${reimb.toFixed(2)}`);
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
    const reimb = Math.round(miles * settings.irs_rate * 100) / 100;
    try {
      await api("trips", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.name,
          from_project_id: fromP.id,
          from_project_name: fromP.name,
          from_address: fromP.address,
          to_project_id: toP.id,
          to_project_name: toP.name,
          to_address: toP.address,
          miles,
          reimbursement: reimb,
          irs_rate: settings.irs_rate,
          note: tripNote,
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
      show(`${miles} mi logged — $${reimb.toFixed(2)}`);
    } catch (e) {
      show("Error saving trip");
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
      const fG = await geocode(fP.address);
      const tG = await geocode(tP.address);
      if (fG && tG) {
        const m = await getDrivingMiles(fG, tG);
        if (m) {
          miles = m;
          reimb = Math.round(m * settings.irs_rate * 100) / 100;
        }
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
    if (!euN.trim() || !euE.trim() || euP.length !== 4) {
      show("Fill all fields");
      return;
    }
    try {
      await api(`yard_users?id=eq.${editUser}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: euN.trim(),
          email: euE.toLowerCase().trim(),
          pin: euP
        })
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
  const todayTrips = myTrips.filter(t => t.trip_date === today());
  const ppTrips = myTrips.filter(
    t => t.trip_date >= pp.start && t.trip_date <= pp.end
  );
  const ytdTrips = myTrips.filter(t => t.trip_date >= `${thisYear()}-01-01`);
  const todayMiles = todayTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);
  const ppMiles = ppTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);
  const ytdMiles = ytdTrips.reduce((s, t) => t.status === "rejected" ? s : s + Number(t.miles), 0);

  console.log("=== REPORTS DEBUG ===");
  console.log("Total trips loaded:", trips.length);
  console.log("All trip dates:", trips.map(t => ({date: t.trip_date, user: t.user_name})));
  console.log("Current pay period:", pp);
  console.log("reportUser:", reportUser);
  console.log("reportPeriod:", reportPeriod);
  console.log("Current user:", user?.name, "Role:", user?.role, "ID:", user?.id);
  
  const allFilteredTrips = trips.filter(t => {
    const userMatch = reportUser === "all" || t.user_id === reportUser;
    let periodMatch = true;
    
    if (reportPeriod === "current") {
      periodMatch = t.trip_date >= pp.start && t.trip_date <= pp.end;
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
  
  console.log("Filtered report trips:", reportTrips.length);
  console.log("Report trip details:", reportTrips.map(t => ({date: t.trip_date, user: t.user_name, miles: t.miles})));
  console.log("===================");
  const reportMiles = reportTrips.reduce((s, t) => s + Number(t.miles), 0);
  const reportReimb = reportTrips.reduce(
    (s, t) => s + Number(t.reimbursement),
    0
  );

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
      const periodDates = reportPeriod === 'current' ? `${fmtDate(pp.start)} - ${fmtDate(pp.end)}` : reportPeriod === 'monthly' ? new Date(reportMonth + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : reportPeriod === 'ytd' ? `${thisYear()} YTD` : 'All Time';
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

  const css = `@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}input:focus,select:focus{border-color:${P.red}!important}@media print{nav,button,.no-print{display:none!important}}`;

  if (!user)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: P.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: Ft.b
        }}
      >
        <style>{css}</style>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
          <div
            style={{
              display: "flex",
              height: 4,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 28
            }}
          >
            <div style={{ flex: 1, background: P.tan }} />
            <div style={{ flex: 1, background: P.red }} />
            <div style={{ flex: 1, background: P.blk }} />
          </div>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex" }}>
              <Logo />
            </div>
            <p style={{ fontSize: 13, color: P.mid, marginTop: 8 }}>
              Outdoor Living — Mileage Tracker
            </p>
          </div>
          <div
            style={{
              display: "flex",
              background: P.bdrL,
              borderRadius: 10,
              padding: 3,
              marginBottom: 24
            }}
          >
            {["login", "signup"].map(m => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setAErr("");
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? P.txt : P.lt,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: Ft.b,
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.1)" : "none"
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
          {mode === "signup" && (
            <>
              <Fl label="Your Name">
                <input
                  style={iS}
                  value={aName}
                  onChange={e => setAN(e.target.value)}
                  placeholder="e.g. Stephen"
                />
              </Fl>
              <Fl label="Email">
                <input
                  style={iS}
                  type="email"
                  value={aEmail}
                  onChange={e => setAE(e.target.value)}
                  placeholder="you@email.com"
                />
              </Fl>
              <Fl label="Create 4-digit PIN">
                <input
                  style={{
                    ...iS,
                    textAlign: "center",
                    fontSize: 24,
                    letterSpacing: 12,
                    fontFamily: Ft.m
                  }}
                  maxLength={4}
                  value={aPin}
                  onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="• • • •"
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
              <Btn full onClick={signup}>
                Create Account
              </Btn>
            </>
          )}
          {mode === "login" && (
            <>
              <Fl label="Your Name">
                <input
                  style={iS}
                  value={aName}
                  onChange={e => setAN(e.target.value)}
                  placeholder="e.g. Stephen"
                  onKeyDown={e => {
                    if (e.key === "Enter") document.getElementById("pin")?.focus();
                  }}
                />
              </Fl>
              <Fl label="4-digit PIN">
                <input
                  id="pin"
                  style={{
                    ...iS,
                    textAlign: "center",
                    fontSize: 24,
                    letterSpacing: 12,
                    fontFamily: Ft.m
                  }}
                  maxLength={4}
                  value={aPin}
                  onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="• • • •"
                  onKeyDown={e => {
                    if (e.key === "Enter" && aPin.length === 4) login();
                  }}
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
    );

  if (!loaded)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: P.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: Ft.m,
          color: P.lt
        }}
      >
        <style>{css}</style>
        Loading...
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        fontFamily: Ft.b,
        paddingBottom: 80
      }}
    >
      <style>{css}</style>
      <div
        style={{
          padding: "14px 16px",
          background: "#fff",
          borderBottom: `1px solid ${P.bdr}`,
          borderTop: `3px solid ${P.tan}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: P.lt, fontFamily: Ft.m }}>
            {user.name}
          </span>
          {isA && (
            <span
              style={{
                background: P.rBg,
                color: P.red,
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                fontFamily: Ft.m
              }}
            >
              {RLBL[user.role]}
            </span>
          )}
          <button
            onClick={() => {
              setUser(null);
              setAN("");
              setAP("");
              setAdPg("hub");
            }}
            style={{
              background: P.tBg,
              border: "none",
              cursor: "pointer",
              color: P.mid,
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: Ft.m,
              fontWeight: 600
            }}
          >
            Log Out
          </button>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 20
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: `1px solid ${P.bdr}`,
                  borderLeft: `3px solid ${P.tan}`
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
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: Ft.h }}>
                  {todayMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: `1px solid ${P.bdr}`,
                  borderLeft: `3px solid ${P.red}`
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
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: Ft.h }}>
                  {ppMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: `1px solid ${P.bdr}`,
                  borderLeft: `3px solid ${P.blk}`
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
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: Ft.h }}>
                  {ytdMiles.toFixed(1)}
                  <span style={{ fontSize: 11, color: P.mid }}> mi</span>
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${P.bdr}`,
                borderTop: `3px solid ${P.tan}`,
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
                        background: "#fff",
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
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${P.bdr}`,
                borderTop: `3px solid ${P.red}`,
                marginBottom: 16
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: Ft.m,
                      color: P.lt,
                      textTransform: "uppercase"
                    }}
                  >
                    Pay Period Miles
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: Ft.h }}>
                    {ppMiles.toFixed(1)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: P.grn,
                      fontFamily: Ft.m,
                      fontWeight: 600
                    }}
                  >
                    ${(ppMiles * settings.irs_rate).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: Ft.m,
                      color: P.lt,
                      textTransform: "uppercase"
                    }}
                  >
                    Year to Date
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: Ft.h }}>
                    {ytdMiles.toFixed(1)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: P.grn,
                      fontFamily: Ft.m,
                      fontWeight: 600
                    }}
                  >
                    ${(ytdMiles * settings.irs_rate).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: P.lt, fontFamily: Ft.m }}>
                {settings.pay_period_frequency === "weekly" ? "Weekly" : settings.pay_period_frequency === "monthly" ? "Monthly" : "Bi-weekly"} Period: {fmtDate(pp.start)} – {fmtDate(pp.end)} · Rate: $
                {settings.irs_rate}/mi
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
                    background: "#fff",
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
                  background: "#fff",
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
                    <option value="current">Current Pay Period</option>
                    <option value="monthly">Monthly Mileage</option>
                    <option value="ytd">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
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
                    background: "#fff",
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
                        background: "#fff",
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
                            onClick={() => deleteTrip(t.id)}
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
                  return userSep
                    ? [
                        <div
                          key={`us-${t.id}`}
                          style={{ borderTop: `2px solid ${P.red}`, margin: "16px 0" }}
                        />,
                        card
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
                        card
                      ]
                    : [card];
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
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 20px",
                      background: "#fff",
                      borderRadius: 14,
                      border: `1px solid ${P.bdr}`,
                      borderLeft: `4px solid ${p.c}`,
                      marginBottom: 10,
                      cursor: "pointer",
                      fontFamily: Ft.b
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
                        background: "#fff",
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
                                setEUP(u.pin);
                              }}
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${P.bdr}`,
                                background: "#fff",
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
                    background: "#fff",
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
                    background: "#fff",
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
        <Fl label="Email">
          <input
            style={iS}
            type="email"
            value={euE}
            onChange={e => setEUE(e.target.value)}
          />
        </Fl>
        <Fl label="PIN">
          <input
            style={{
              ...iS,
              textAlign: "center",
              fontSize: 20,
              letterSpacing: 10,
              fontFamily: Ft.m
            }}
            maxLength={4}
            value={euP}
            onChange={e => setEUP(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </Fl>
        <Btn
          full
          disabled={!euN.trim() || !euE.trim() || euP.length !== 4}
          onClick={saveEU}
        >
          Save
        </Btn>
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
              background: "#fff",
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

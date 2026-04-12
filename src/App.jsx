import { useState, useEffect, useCallback } from "react";

const SB = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function api(p, o = {}) { const r = await fetch(`${SB}/rest/v1/${p}`, { headers: H, ...o }); const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : []; }

async function geocode(addr) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`);
  const d = await r.json();
  return d && d.length > 0 ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
}

async function getDrivingMiles(from, to) {
  const a = await geocode(from), b = await geocode(to);
  if (!a || !b) return null;
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`);
  const d = await r.json();
  return d.code === "Ok" && d.routes?.length ? Math.round(d.routes[0].distance * 0.000621371 * 10) / 10 : null;
}

function getPayPeriod(date, anchor) {
  const d = new Date(date), a = new Date(anchor);
  const diff = Math.floor((d - a) / (14 * 86400000));
  const s = new Date(a.getTime() + diff * 14 * 86400000);
  const e = new Date(s.getTime() + 13 * 86400000);
  if (d < s) { s.setTime(s.getTime() - 14 * 86400000); e.setTime(e.getTime() - 14 * 86400000); }
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
}

function fD(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function fDF(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function today() { return new Date().toISOString().slice(0, 10); }
function yr() { return new Date().getFullYear(); }

const ROLES = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RL = { super_admin: "Owner", senior_admin: "Senior Admin", admin: "Admin", user: "User" };

const C = { bg: "#faf8f5", card: "#fff", bd: "#e5e0d8", bdL: "#f0ece6", tx: "#1a1a1a", mid: "#6b6560", lt: "#9c9590", red: "#c41e2a", rBg: "rgba(196,30,42,0.06)", tan: "#c4b59a", tBg: "rgba(196,181,154,0.12)", bk: "#1a1a1a", gn: "#16a34a", gBg: "rgba(22,163,74,0.08)", am: "#d97706", aBg: "rgba(217,119,6,0.08)", bl: "#2563eb" };
const F = { h: "'Bitter',serif", b: "'Source Sans 3',sans-serif", m: "'IBM Plex Mono',monospace" };
const iS = { width: "100%", padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 15, fontFamily: F.b, outline: "none", boxSizing: "border-box" };

function Logo() {
  return <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg width="38" height="38" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff" stroke={C.bd} strokeWidth="1.5" /><path d="M30 78 C30 78,28 55,32 40 C36 25,38 20,36 15" fill="none" stroke={C.tan} strokeWidth="6" strokeLinecap="round" /><path d="M38 78 C38 78,36 50,42 35 C48 20,50 14,47 8" fill="none" stroke={C.red} strokeWidth="6.5" strokeLinecap="round" /><path d="M44 80 L44 30 L58 55 L72 22 L72 80" fill="none" stroke={C.bk} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <div><div style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Masterpiece</div><div style={{ fontSize: 8, fontFamily: F.m, color: C.red, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Mileage Tracker</div></div>
  </div>;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", background: C.card, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "20px 20px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)", animation: "slideUp .3s ease" }}>
      <div style={{ width: 40, height: 4, background: C.bd, borderRadius: 2, margin: "0 auto 16px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: F.h }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.lt, cursor: "pointer", fontSize: 20 }}>✕</button>
      </div>{children}
    </div>
  </div>;
}

function Fl({ label, children }) { return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: F.m }}>{label}</label>{children}</div>; }
function Btn({ children, onClick, color = C.red, full, disabled, small, sx }) { return <button onClick={disabled ? undefined : onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: small ? "8px 14px" : "12px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: F.b, opacity: disabled ? 0.4 : 1, width: full ? "100%" : "auto", ...sx }}>{children}</button>; }
function Toast({ m, s }) { return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: `translateX(-50%) translateY(${s ? 0 : 20}px)`, background: C.red, color: "#fff", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: F.b, opacity: s ? 1 : 0, transition: "all .3s", pointerEvents: "none", zIndex: 9999, maxWidth: "90%", textAlign: "center" }}>{m}</div>; }

function Nav({ tab, set, admin }) {
  const ts = [{ k: "log", l: "Log Trip" }, { k: "trips", l: "My Trips" }, { k: "map", l: "Map" }, { k: "projects", l: "Projects" }, { k: "reports", l: "Reports" }];
  if (admin) ts.push({ k: "settings", l: "Settings" });
  return <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#fff", borderTop: `2px solid ${C.tan}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom,8px)" }}>
    {ts.map(t => <button key={t.k} onClick={() => set(t.k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 6px", background: "none", border: "none", cursor: "pointer", color: tab === t.k ? C.red : C.lt, borderTop: tab === t.k ? `2px solid ${C.red}` : "2px solid transparent", marginTop: -2, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.m }}>{t.l}</span>
    </button>)}
  </nav>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [aName, setAN] = useState(""); const [aPin, setAP] = useState("");
  const [aEmail, setAE] = useState(""); const [aErr, setAErr] = useState("");

  const [projs, setProjs] = useState([]); const [trips, setTrips] = useState([]);
  const [settings, setSettings] = useState({ irs_rate: 0.70, pay_period_anchor: "2026-01-06" });
  const [users, setUsr] = useState([]);

  const [tab, setTab] = useState("log");
  const [fromId, setFromId] = useState(""); const [toId, setToId] = useState("");
  const [tripNote, setTripNote] = useState(""); const [calc, setCalc] = useState(false);
  const [projMod, setProjMod] = useState(false);
  const [nPN, setNPN] = useState(""); const [nPA, setNPA] = useState("");
  const [reportUser, setRU] = useState("all"); const [reportPeriod, setRP] = useState("current");
  const [sRate, setSRate] = useState(""); const [sAnchor, setSAnchor] = useState("");
  const [emailTo, setEmailTo] = useState(""); const [emailMod, setEmailMod] = useState(false);
  const [toast, setToast] = useState({ m: "", s: false });
  const [loaded, setLoaded] = useState(false);
  const [mapPins, setMapPins] = useState([]); const [mapLoading, setMapLoad] = useState(false);
  const [projFilter, setProjFilter] = useState("active");

  const show = useCallback(m => { setToast({ m, s: true }); setTimeout(() => setToast(t => ({ ...t, s: false })), 2800); }, []);
  const isA = user && ROLES[user.role] >= 2;
  const isS = user && ROLES[user.role] >= 3;

  const load = useCallback(async () => {
    try {
      const [p, t, s, u] = await Promise.all([
        api("projects?order=name"), api("trips?order=trip_date.desc,created_at.desc&limit=500"),
        api("mileage_settings?limit=1"), api("yard_users?order=name"),
      ]);
      setProjs(p); setTrips(t); setUsr(u);
      if (s && s[0]) { setSettings(s[0]); setSRate(s[0].irs_rate.toString()); setSAnchor(s[0].pay_period_anchor); }
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { if (!user) return; const i = setInterval(load, 15000); return () => clearInterval(i); }, [user, load]);

  const login = async () => {
    setAErr("");
    if (!aName.trim() || aPin.length !== 4) { setAErr("Enter name and 4-digit PIN."); return; }
    try {
      const all = await api("yard_users?active=eq.true");
      const found = all.find(u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin);
      if (!found) { setAErr("Name or PIN not found."); return; }
      setUser(found); show(`Welcome back, ${found.name}!`);
    } catch (e) { setAErr("Connection error."); }
  };

  const signup = async () => {
    setAErr("");
    if (!aName.trim() || !aEmail.trim() || aPin.length !== 4) { setAErr("Fill all fields."); return; }
    try {
      const ex = await api(`yard_users?email=eq.${encodeURIComponent(aEmail.toLowerCase().trim())}`);
      if (ex?.length > 0) { setAErr("Email registered. Log in."); return; }
      const res = await api("yard_users", { method: "POST", body: JSON.stringify({ email: aEmail.toLowerCase().trim(), name: aName.trim(), pin: aPin, role: "user" }) });
      if (res?.[0]) { setUser(res[0]); show(`Welcome, ${res[0].name}!`); }
    } catch (e) { setAErr("Signup failed."); }
  };

  const logTrip = async () => {
    if (!fromId || !toId || fromId === toId) { show("Select two different projects"); return; }
    const fp = projs.find(p => p.id === fromId), tp = projs.find(p => p.id === toId);
    if (!fp?.address || !tp?.address) { show("Both projects need addresses"); return; }
    setCalc(true);
    try {
      const miles = await getDrivingMiles(fp.address, tp.address);
      if (!miles) { show("Couldn't calculate route. Check addresses."); setCalc(false); return; }
      const reimb = Math.round(miles * settings.irs_rate * 100) / 100;
      await api("trips", { method: "POST", body: JSON.stringify({ user_id: user.id, user_name: user.name, from_project_id: fp.id, from_project_name: fp.name, from_address: fp.address, to_project_id: tp.id, to_project_name: tp.name, to_address: tp.address, miles, reimbursement: reimb, irs_rate: settings.irs_rate, note: tripNote, trip_date: today() }) });
      await load(); setFromId(toId); setToId(""); setTripNote("");
      show(`${miles} mi logged — $${reimb.toFixed(2)}`);
    } catch (e) { show("Error logging trip"); }
    setCalc(false);
  };

  const saveProj = async () => { if (!nPN.trim() || !nPA.trim()) { show("Need name and address"); return; } try { await api("projects", { method: "POST", body: JSON.stringify({ name: nPN.trim(), address: nPA.trim() }) }); await load(); setProjMod(false); setNPN(""); setNPA(""); show("Project added"); } catch (e) { show("Error"); } };
  const toggleProj = async (id, active) => { try { await api(`projects?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !active }) }); await load(); show(active ? "Project archived" : "Project restored"); } catch (e) { show("Error"); } };
  const saveSett = async () => { try { await api(`mileage_settings?id=eq.${settings.id}`, { method: "PATCH", body: JSON.stringify({ irs_rate: parseFloat(sRate) || 0.70, pay_period_anchor: sAnchor, updated_at: new Date().toISOString() }) }); await load(); show("Settings saved"); } catch (e) { show("Error"); } };
  const approveTrip = async id => { try { await api(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) }); await load(); show("Approved"); } catch (e) { show("Error"); } };
  const rejectTrip = async id => { try { await api(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }); await load(); show("Rejected"); } catch (e) { show("Error"); } };
  const deleteTrip = async id => { try { await api(`trips?id=eq.${id}`, { method: "DELETE" }); await load(); show("Deleted"); } catch (e) { show("Error"); } };

  const myTrips = trips.filter(t => t.user_id === user?.id);
  const pp = getPayPeriod(today(), settings.pay_period_anchor);
  const todayTrips = myTrips.filter(t => t.trip_date === today());
  const ppTrips = myTrips.filter(t => t.trip_date >= pp.start && t.trip_date <= pp.end);
  const ytdTrips = myTrips.filter(t => t.trip_date >= `${yr()}-01-01`);
  const todayMi = todayTrips.reduce((s, t) => s + Number(t.miles), 0);
  const ppMi = ppTrips.reduce((s, t) => s + Number(t.miles), 0);
  const ytdMi = ytdTrips.reduce((s, t) => s + Number(t.miles), 0);

  const rTrips = trips.filter(t => {
    if (!isA && t.user_id !== user?.id) return false;
    if (reportUser !== "all" && t.user_id !== reportUser) return false;
    if (reportPeriod === "current") return t.trip_date >= pp.start && t.trip_date <= pp.end;
    if (reportPeriod === "ytd") return t.trip_date >= `${yr()}-01-01`;
    return true;
  });
  const rMi = rTrips.reduce((s, t) => s + Number(t.miles), 0);
  const rRe = rTrips.reduce((s, t) => s + Number(t.reimbursement), 0);

  const exportCSV = () => {
    const rows = [["Date", "Employee", "From", "To", "Miles", "Rate", "Reimbursement", "Status"]];
    rTrips.forEach(t => rows.push([t.trip_date, t.user_name, t.from_project_name, t.to_project_name, t.miles, `$${t.irs_rate}`, `$${Number(t.reimbursement).toFixed(2)}`, t.status]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href = u; a.download = `mileage-${today()}.csv`; a.click(); URL.revokeObjectURL(u);
    show("Downloaded");
  };

  const emailReport = () => {
    if (!emailTo.trim()) return;
    const subj = `Masterpiece Mileage Report - ${today()}`;
    const lines = [`Masterpiece Outdoor Living — Mileage Report`, `Period: ${reportPeriod === "current" ? fD(pp.start) + " - " + fD(pp.end) : reportPeriod === "ytd" ? "YTD " + yr() : "All Time"}`, `Total Miles: ${rMi.toFixed(1)}`, `Reimbursement: $${rRe.toFixed(2)}`, `Trips: ${rTrips.length}`, `Rate: $${settings.irs_rate}/mi`, ``, `--- Trips ---`];
    rTrips.forEach(t => lines.push(`${t.trip_date} | ${t.user_name} | ${t.from_project_name} > ${t.to_project_name} | ${Number(t.miles).toFixed(1)} mi | $${Number(t.reimbursement).toFixed(2)}`));
    window.open(`mailto:${emailTo.trim()}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(lines.join("\n"))}`);
    setEmailMod(false); show(`Opening email to ${emailTo.trim()}`);
  };

  const loadMap = async () => {
    setMapLoad(true);
    const pins = [];
    for (const p of projs.filter(p => p.address && p.active !== false)) {
      try {
        const g = await geocode(p.address);
        if (g) pins.push({ ...p, lat: g.lat, lng: g.lng });
        await new Promise(r => setTimeout(r, 1100));
      } catch (e) { console.error(e); }
    }
    setMapPins(pins); setMapLoad(false);
  };

  // Group trips by day
  function groupByDay(tripList) {
    const days = {};
    tripList.forEach(t => { if (!days[t.trip_date]) days[t.trip_date] = []; days[t.trip_date].push(t); });
    return Object.keys(days).sort((a, b) => b.localeCompare(a)).map(d => ({
      date: d, trips: days[d],
      miles: days[d].reduce((s, t) => s + Number(t.miles), 0),
      reimb: days[d].reduce((s, t) => s + Number(t.reimbursement), 0),
    }));
  }

  const css = `@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}input:focus,select:focus{border-color:${C.red}!important}`;

  // ═══ AUTH ═══
  if (!user) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: F.b }}><style>{css}</style>
    <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", height: 4, borderRadius: 4, overflow: "hidden", marginBottom: 28 }}><div style={{ flex: 1, background: C.tan }} /><div style={{ flex: 1, background: C.red }} /><div style={{ flex: 1, background: C.bk }} /></div>
      <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ display: "inline-flex" }}><Logo /></div><p style={{ fontSize: 13, color: C.mid, marginTop: 8 }}>Outdoor Living — Mileage Tracker</p></div>
      <div style={{ display: "flex", background: C.bdL, borderRadius: 10, padding: 3, marginBottom: 24 }}>
        {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setAErr(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: mode === m ? "#fff" : "transparent", color: mode === m ? C.tx : C.lt, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F.b, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
      </div>
      {mode === "signup" && <>
        <Fl label="Your Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" /></Fl>
        <Fl label="Email"><input style={iS} type="email" value={aEmail} onChange={e => setAE(e.target.value)} placeholder="you@email.com" /></Fl>
        <Fl label="Create 4-digit PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" /></Fl>
        {aErr && <div style={{ color: C.red, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}
        <Btn full onClick={signup}>Create Account</Btn>
      </>}
      {mode === "login" && <>
        <Fl label="Your Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" onKeyDown={e => { if (e.key === "Enter") document.getElementById("pin")?.focus(); }} /></Fl>
        <Fl label="4-digit PIN"><input id="pin" style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter" && aPin.length === 4) login(); }} /></Fl>
        {aErr && <div style={{ color: C.red, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}
        <Btn full onClick={login}>Enter Mileage Tracker</Btn>
      </>}
    </div>
  </div>;

  if (!loaded) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.m, color: C.lt }}><style>{css}</style>Loading...</div>;

  // ═══ MAIN ═══
  return <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.b, paddingBottom: 80 }}><style>{css}</style>
    <div style={{ padding: "14px 16px", background: "#fff", borderBottom: `1px solid ${C.bd}`, borderTop: `3px solid ${C.tan}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Logo />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.lt, fontFamily: F.m }}>{user.name}</span>
        {isA && <span style={{ background: C.rBg, color: C.red, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: F.m }}>{RL[user.role]}</span>}
        <button onClick={() => { setUser(null); setAN(""); setAP(""); }} style={{ background: C.tBg, border: "none", cursor: "pointer", color: C.mid, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontFamily: F.m, fontWeight: 600 }}>Log Out</button>
      </div>
    </div>

    <div style={{ padding: "16px 16px 0" }}>

      {/* ═══ LOG TRIP ═══ */}
      {tab === "log" && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Log Trip</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[{ l: "Today", v: todayMi, b: C.tan }, { l: "Pay Period", v: ppMi, b: C.red }, { l: "YTD", v: ytdMi, b: C.bk }].map(s =>
            <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.bd}`, borderLeft: `3px solid ${s.b}` }}>
              <div style={{ fontSize: 10, fontFamily: F.m, color: C.lt, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: F.h }}>{s.v.toFixed(1)}<span style={{ fontSize: 11, color: C.mid }}> mi</span></div>
            </div>)}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.tan}`, marginBottom: 16 }}>
          <Fl label="From">
            <select value={fromId} onChange={e => setFromId(e.target.value)} style={{ ...iS, appearance: "none" }}>
              <option value="">Select starting project...</option>
              {projs.filter(p => p.address && p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Fl>
          <div style={{ textAlign: "center", color: C.lt, fontSize: 20, margin: "-4px 0 4px" }}>↓</div>
          <Fl label="To">
            <select value={toId} onChange={e => setToId(e.target.value)} style={{ ...iS, appearance: "none" }}>
              <option value="">Select destination...</option>
              {projs.filter(p => p.address && p.active !== false && p.id !== fromId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Fl>
          <Fl label="Note (optional)"><input style={iS} value={tripNote} onChange={e => setTripNote(e.target.value)} placeholder="e.g. picking up materials" /></Fl>
          <Btn full disabled={!fromId || !toId || fromId === toId || calc} onClick={logTrip}>
            {calc ? "Calculating route..." : "Log Trip"}
          </Btn>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.lt, fontFamily: F.m }}>
            IRS: ${settings.irs_rate}/mi · {fD(pp.start)} – {fD(pp.end)}
          </div>
        </div>

        {todayTrips.length > 0 && <>
          <h3 style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Today ({todayMi.toFixed(1)} mi · ${(todayMi * settings.irs_rate).toFixed(2)})</h3>
          {todayTrips.map(t => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${C.bd}`, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>
              <div style={{ textAlign: "right" }}><span style={{ fontWeight: 700, fontFamily: F.h }}>{Number(t.miles).toFixed(1)} mi</span> <span style={{ fontSize: 12, color: C.gn, fontFamily: F.m }}>${Number(t.reimbursement).toFixed(2)}</span></div>
            </div>
          </div>)}
        </>}
      </div>}

      {/* ═══ MY TRIPS (grouped by day) ═══ */}
      {tab === "trips" && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>My Trips</h2>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.red}`, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.lt, textTransform: "uppercase" }}>Pay Period</div><div style={{ fontSize: 32, fontWeight: 700, fontFamily: F.h }}>{ppMi.toFixed(1)}</div><div style={{ fontSize: 13, color: C.gn, fontFamily: F.m, fontWeight: 600 }}>${(ppMi * settings.irs_rate).toFixed(2)}</div></div>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.lt, textTransform: "uppercase" }}>Year to Date</div><div style={{ fontSize: 32, fontWeight: 700, fontFamily: F.h }}>{ytdMi.toFixed(1)}</div><div style={{ fontSize: 13, color: C.gn, fontFamily: F.m, fontWeight: 600 }}>${(ytdMi * settings.irs_rate).toFixed(2)}</div></div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: C.lt, fontFamily: F.m }}>{fD(pp.start)} – {fD(pp.end)} · ${settings.irs_rate}/mi</div>
        </div>

        {(() => {
          const days = groupByDay(myTrips);
          return days.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: C.lt, fontFamily: F.m }}>No trips yet</div>
            : days.map(day => <div key={day.date} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.tBg, borderRadius: "12px 12px 0 0", borderBottom: `2px solid ${C.tan}` }}>
                <div style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700 }}>{fD(day.date)}</div>
                <div><span style={{ fontWeight: 700, fontFamily: F.h }}>{day.miles.toFixed(1)} mi</span><span style={{ fontSize: 12, color: C.gn, fontFamily: F.m, marginLeft: 8 }}>${day.reimb.toFixed(2)}</span></div>
              </div>
              {day.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${C.bd}`, borderTop: "none", borderRadius: i === day.trips.length - 1 ? "0 0 12px 12px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>
                    {t.note && <div style={{ fontSize: 11, color: C.lt, marginTop: 2, fontStyle: "italic" }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.h }}>{Number(t.miles).toFixed(1)} mi</div>
                    <div style={{ fontSize: 11, color: C.gn, fontFamily: F.m }}>${Number(t.reimbursement).toFixed(2)}</div>
                  </div>
                </div>
              </div>)}
            </div>);
        })()}
      </div>}

      {/* ═══ MAP ═══ */}
      {tab === "map" && <div style={{ animation: "fadeIn .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Project Map</h2>
          {!mapLoading && <Btn small color={C.bk} onClick={loadMap}>{mapPins.length > 0 ? "Refresh" : "Load Map"}</Btn>}
        </div>

        {mapLoading && <div style={{ padding: 40, textAlign: "center", color: C.mid, fontFamily: F.m }}>
          Locating {projs.filter(p => p.address && p.active !== false).length} projects...
        </div>}

        {!mapLoading && mapPins.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.mid }}>
          Tap "Load Map" to see all project locations
        </div>}

        {!mapLoading && mapPins.length > 0 && (() => {
          const lats = mapPins.map(p => p.lat), lngs = mapPins.map(p => p.lng);
          const mnLa = Math.min(...lats), mxLa = Math.max(...lats);
          const mnLo = Math.min(...lngs), mxLo = Math.max(...lngs);
          const pad = 0.02;
          return <div>
            <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.bd}`, marginBottom: 16 }}>
              <iframe title="Map" width="100%" height="400" frameBorder="0" style={{ display: "block" }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mnLo - pad},${mnLa - pad},${mxLo + pad},${mxLa + pad}&layer=mapnik`} />
            </div>
            <h3 style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>{mapPins.length} Projects</h3>
            {mapPins.map(p => <div key={p.id} style={{ padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${C.bd}`, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11, color: C.lt, fontFamily: F.m }}>{p.address}</div></div>
              </div>
            </div>)}
          </div>;
        })()}
      </div>}

      {/* ═══ PROJECTS ═══ */}
      {tab === "projects" && <div style={{ animation: "fadeIn .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Projects</h2>
          {isA && <Btn small onClick={() => setProjMod(true)}>+ Add Project</Btn>}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["active", "archived", "all"].map(f => <button key={f} onClick={() => setProjFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${projFilter === f ? C.tan : C.bd}`, background: projFilter === f ? C.tBg : "#fff", color: projFilter === f ? C.bk : C.mid, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", fontFamily: F.b }}>{f}</button>)}
        </div>

        {projs.filter(p => {
          if (projFilter === "active") return p.active !== false;
          if (projFilter === "archived") return p.active === false;
          return true;
        }).map(p => <div key={p.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${C.bd}`, marginBottom: 8, borderLeft: `3px solid ${p.active !== false ? C.tan : C.lt}`, opacity: p.active !== false ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.lt, marginTop: 2 }}>{p.address || "No address"}</div>
              <div style={{ fontSize: 11, color: C.mid, fontFamily: F.m, marginTop: 4 }}>
                {trips.filter(t => t.from_project_id === p.id || t.to_project_id === p.id).length} trips
              </div>
            </div>
            {isA && <button onClick={() => toggleProj(p.id, p.active !== false)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: p.active !== false ? C.aBg : C.gBg, color: p.active !== false ? C.am : C.gn, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{p.active !== false ? "Archive" : "Restore"}</button>}
          </div>
        </div>)}
      </div>}

      {/* ═══ REPORTS ═══ */}
      {tab === "reports" && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Reports</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {isA && <select value={reportUser} onChange={e => setRU(e.target.value)} style={{ ...iS, width: "auto", flex: 1 }}>
            <option value="all">All Employees</option>
            {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>}
          <select value={reportPeriod} onChange={e => setRP(e.target.value)} style={{ ...iS, width: "auto", flex: 1 }}>
            <option value="current">Current Pay Period</option>
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.red}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.lt, textTransform: "uppercase" }}>Total Miles</div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: F.h }}>{rMi.toFixed(1)}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, fontFamily: F.m, color: C.lt, textTransform: "uppercase" }}>Reimbursement</div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: F.h, color: C.gn }}>${rRe.toFixed(2)}</div></div>
          </div>
          <div style={{ fontSize: 11, color: C.lt, fontFamily: F.m, marginTop: 8 }}>{rTrips.length} trips</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn small onClick={exportCSV} color={C.bk}>Download CSV</Btn>
          <Btn small onClick={() => setEmailMod(true)}>Email Report</Btn>
        </div>

        {/* Report trips grouped by day */}
        {(() => {
          const days = groupByDay(rTrips);
          return days.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: C.lt, fontFamily: F.m }}>No trips</div>
            : days.map(day => <div key={day.date} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: C.tBg, borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.tan}` }}>
                <span style={{ fontFamily: F.h, fontSize: 13, fontWeight: 700 }}>{fD(day.date)}</span>
                <span style={{ fontSize: 13, fontFamily: F.m }}>{day.miles.toFixed(1)} mi · ${day.reimb.toFixed(2)}</span>
              </div>
              {day.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${C.bd}`, borderTop: "none", borderRadius: i === day.trips.length - 1 ? "0 0 10px 10px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {isA && <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>{t.user_name}</div>}
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.h }}>{Number(t.miles).toFixed(1)} mi</div>
                    <div style={{ fontSize: 11, color: C.gn, fontFamily: F.m }}>${Number(t.reimbursement).toFixed(2)}</div>
                    <span style={{ fontSize: 10, fontFamily: F.m, padding: "1px 6px", borderRadius: 4, background: t.status === "approved" ? C.gBg : t.status === "rejected" ? C.rBg : C.aBg, color: t.status === "approved" ? C.gn : t.status === "rejected" ? C.red : C.am }}>{t.status}</span>
                  </div>
                </div>
                {isA && t.status === "logged" && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn small color={C.gn} onClick={() => approveTrip(t.id)} sx={{ flex: 1 }}>Approve</Btn>
                  <Btn small color={C.red} onClick={() => rejectTrip(t.id)} sx={{ flex: 1 }}>Reject</Btn>
                </div>}
                {isA && <button onClick={() => deleteTrip(t.id)} style={{ fontSize: 11, color: C.lt, background: "none", border: "none", cursor: "pointer", marginTop: 4, fontFamily: F.m }}>Delete</button>}
              </div>)}
            </div>);
        })()}
      </div>}

      {/* ═══ SETTINGS ═══ */}
      {tab === "settings" && isA && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Settings</h2>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${C.red}` }}>
          <h3 style={{ fontSize: 13, fontFamily: F.m, margin: "0 0 12px" }}>IRS RATE</h3>
          <Fl label="Rate ($/mile)"><input style={iS} type="number" step="0.01" value={sRate} onChange={e => setSRate(e.target.value)} /></Fl>
          <div style={{ fontSize: 12, color: C.lt, fontFamily: F.m }}>2025 rate: $0.70/mile</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${C.tan}` }}>
          <h3 style={{ fontSize: 13, fontFamily: F.m, margin: "0 0 12px" }}>PAY PERIOD</h3>
          <Fl label="Anchor Date"><input style={iS} type="date" value={sAnchor} onChange={e => setSAnchor(e.target.value)} /></Fl>
          <div style={{ fontSize: 12, color: C.lt, fontFamily: F.m }}>Start date of any pay period. App calculates all periods from here.</div>
        </div>
        <Btn full onClick={saveSett}>Save Settings</Btn>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginTop: 16, borderTop: `3px solid ${C.bk}` }}>
          <h3 style={{ fontSize: 13, fontFamily: F.m, margin: "0 0 12px" }}>USERS ({users.length})</h3>
          {users.map(u => <div key={u.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.bdL}`, display: "flex", justifyContent: "space-between" }}>
            <div><span style={{ fontWeight: 600, color: u.active ? C.tx : C.lt }}>{u.name}</span><span style={{ fontSize: 11, color: C.lt, fontFamily: F.m, marginLeft: 8 }}>{RL[u.role]}</span></div>
            <span style={{ fontSize: 11, fontFamily: F.m, color: u.active ? C.gn : C.red }}>{u.active ? "Active" : "Inactive"}</span>
          </div>)}
        </div>
      </div>}
    </div>

    {/* Modals */}
    <Modal open={projMod} onClose={() => setProjMod(false)} title="Add Project">
      <Fl label="Project Name"><input style={iS} value={nPN} onChange={e => setNPN(e.target.value)} placeholder="e.g. Henderson Patio" /></Fl>
      <Fl label="Address (required)"><input style={iS} value={nPA} onChange={e => setNPA(e.target.value)} placeholder="4521 Elm St, Denver, CO" /></Fl>
      <div style={{ fontSize: 12, color: C.am, marginBottom: 12, fontFamily: F.m }}>Full address with city/state needed for mileage calculation.</div>
      <Btn full disabled={!nPN.trim() || !nPA.trim()} onClick={saveProj}>Add Project</Btn>
    </Modal>

    <Modal open={emailMod} onClose={() => setEmailMod(false)} title="Email Report">
      <div style={{ background: C.tBg, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: F.h }}>{rMi.toFixed(1)} mi · ${rRe.toFixed(2)}</div>
        <div style={{ fontSize: 11, color: C.lt, fontFamily: F.m, marginTop: 4 }}>{rTrips.length} trips</div>
      </div>
      <Fl label="Send to email"><input style={iS} type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="payroll@masterpiecelv.com" onKeyDown={e => { if (e.key === "Enter") emailReport(); }} /></Fl>
      <div style={{ fontSize: 12, color: C.lt, fontFamily: F.m, marginBottom: 16 }}>Opens your email app with the report pre-filled.</div>
      <Btn full disabled={!emailTo.trim()} onClick={emailReport}>Send Report</Btn>
    </Modal>

    <Nav tab={tab} set={setTab} admin={isA} />
    <Toast m={toast.m} s={toast.s} />
  </div>;
}

import { useState, useEffect, useCallback } from "react";

const SB = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";
const HD = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function api(p, o = {}) { const r = await fetch(`${SB}/rest/v1/${p}`, { headers: HD, ...o }); const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : []; }

async function geocode(a) { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(a)}&limit=1`); const d = await r.json(); return d?.length ? { lat: +d[0].lat, lng: +d[0].lon } : null; }
async function getRoute(f, t) { const a = await geocode(f), b = await geocode(t); if (!a || !b) return null; const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`); const d = await r.json(); return d.code === "Ok" && d.routes?.length ? Math.round(d.routes[0].distance * 0.000621371 * 10) / 10 : null; }

function getPP(date, anchor) { const d = new Date(date), a = new Date(anchor), diff = Math.floor((d - a) / 1209600000); const s = new Date(a.getTime() + diff * 1209600000), e = new Date(s.getTime() + 1123200000); if (d < s) { s.setTime(s.getTime() - 1209600000); e.setTime(e.getTime() - 1209600000); } return { s: s.toISOString().slice(0, 10), e: e.toISOString().slice(0, 10) }; }
function getMonth(date) { const d = new Date(date + "T12:00:00"); const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); return { s, e }; }
function fD(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function fDF(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fMo(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function td() { return new Date().toISOString().slice(0, 10); }
function yr() { return new Date().getFullYear(); }

const ROLES = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RL = { super_admin: "Owner", senior_admin: "Sr Admin", admin: "Admin", user: "User" };
const C = { bg: "#faf8f5", c: "#fff", bd: "#e5e0d8", bdL: "#f0ece6", tx: "#1a1a1a", m: "#6b6560", l: "#9c9590", r: "#c41e2a", rB: "rgba(196,30,42,0.06)", tn: "#c4b59a", tB: "rgba(196,181,154,0.12)", bk: "#1a1a1a", g: "#16a34a", gB: "rgba(22,163,74,0.08)", am: "#d97706", aB: "rgba(217,119,6,0.08)" };
const F = { h: "'Bitter',serif", b: "'Source Sans 3',sans-serif", m: "'IBM Plex Mono',monospace" };
const iS = { width: "100%", padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 15, fontFamily: F.b, outline: "none", boxSizing: "border-box" };

function Logo() { return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width="38" height="38" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff" stroke={C.bd} strokeWidth="1.5" /><path d="M30 78 C30 78,28 55,32 40 C36 25,38 20,36 15" fill="none" stroke={C.tn} strokeWidth="6" strokeLinecap="round" /><path d="M38 78 C38 78,36 50,42 35 C48 20,50 14,47 8" fill="none" stroke={C.r} strokeWidth="6.5" strokeLinecap="round" /><path d="M44 80 L44 30 L58 55 L72 22 L72 80" fill="none" stroke={C.bk} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg><div><div style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Masterpiece</div><div style={{ fontSize: 8, fontFamily: F.m, color: C.r, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Mileage Tracker</div></div></div>; }

function Modal({ open, onClose, title, children }) { if (!open) return null; return <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} /><div style={{ position: "relative", background: C.c, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "20px 20px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)", animation: "slideUp .3s ease" }}><div style={{ width: 40, height: 4, background: C.bd, borderRadius: 2, margin: "0 auto 16px" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: F.h }}>{title}</h2><button onClick={onClose} style={{ background: "none", border: "none", color: C.l, cursor: "pointer", fontSize: 20 }}>✕</button></div>{children}</div></div>; }
function Fl({ l, children }) { return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: F.m }}>{l}</label>{children}</div>; }
function Btn({ children, onClick, color = C.r, full, disabled, small, sx }) { return <button onClick={disabled ? undefined : onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: small ? "8px 14px" : "12px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: F.b, opacity: disabled ? 0.4 : 1, width: full ? "100%" : "auto", ...sx }}>{children}</button>; }
function Toast({ msg, show }) { return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, background: C.r, color: "#fff", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: F.b, opacity: show ? 1 : 0, transition: "all .3s", pointerEvents: "none", zIndex: 9999, maxWidth: "90%", textAlign: "center" }}>{msg}</div>; }

function Nav({ tab, set, isAdmin }) {
  const ts = [{ k: "log", l: "Log Trip" }, { k: "trips", l: "My Trips" }, { k: "map", l: "Map" }, { k: "projects", l: "Projects" }];
  if (isAdmin) ts.push({ k: "admin", l: "Admin" });
  return <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#fff", borderTop: `2px solid ${C.tn}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom,8px)" }}>
    {ts.map(t => <button key={t.k} onClick={() => set(t.k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: tab === t.k ? C.r : C.l, borderTop: tab === t.k ? `2px solid ${C.r}` : "2px solid transparent", marginTop: -2, minWidth: 0 }}><span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.m }}>{t.l}</span></button>)}
  </nav>;
}

function groupByDay(list) {
  const d = {}; list.forEach(t => { if (!d[t.trip_date]) d[t.trip_date] = []; d[t.trip_date].push(t); });
  return Object.keys(d).sort((a, b) => b.localeCompare(a)).map(k => ({ date: k, trips: d[k], mi: d[k].reduce((s, t) => s + +t.miles, 0), re: d[k].reduce((s, t) => s + +t.reimbursement, 0) }));
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [aName, setAN] = useState(""); const [aPin, setAP] = useState("");
  const [aEmail, setAE] = useState(""); const [aErr, setAErr] = useState("");
  const [projs, setProjs] = useState([]); const [trips, setTrips] = useState([]);
  const [sett, setSett] = useState({ irs_rate: 0.70, pay_period_anchor: "2026-01-06" });
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("log");
  const [fromId, setFI] = useState(""); const [toId, setTI] = useState(""); const [tNote, setTN] = useState(""); const [calc, setCalc] = useState(false);
  const [toast, setToast] = useState({ m: "", s: false });
  const [loaded, setLoaded] = useState(false);
  const [mapPins, setMP] = useState([]); const [mapLoad, setML] = useState(false); const [myLoc, setMyLoc] = useState(null); const [selPin, setSelPin] = useState(null);
  const [pFilter, setPF] = useState("active");
  const [projMod, setPM] = useState(false); const [nPN, setNPN] = useState(""); const [nPA, setNPA] = useState("");
  // Admin sub-pages
  const [adminPage, setAP2] = useState("hub"); // hub, reports, settings, users
  const [adminAuth, setAA] = useState(false);
  const [aaName, setAAN] = useState(""); const [aaPin, setAAP] = useState(""); const [aaErr, setAAE] = useState("");
  // Report state
  const [rEmp, setRE] = useState("all"); const [rPer, setRP] = useState("current"); const [rEmpDetail, setRED] = useState(null);
  const [emailMod, setEM] = useState(false); const [emailTo, setET] = useState(""); const [emailType, setEType] = useState("one-time");
  const [autoEmail, setAutoEmail] = useState(""); const [autoFreq, setAutoFreq] = useState("biweekly");
  // Settings
  const [sRate, setSR] = useState(""); const [sAnch, setSA] = useState("");

  const show = useCallback(m => { setToast({ m, s: true }); setTimeout(() => setToast(t => ({ ...t, s: false })), 2800); }, []);
  const isA = user && ROLES[user.role] >= 2;
  const isS = user && ROLES[user.role] >= 3;

  const load = useCallback(async () => {
    try {
      const [p, t, s, u] = await Promise.all([api("projects?order=name"), api("trips?order=trip_date.desc,created_at.desc&limit=1000"), api("mileage_settings?limit=1"), api("yard_users?order=name")]);
      setProjs(p); setTrips(t); setUsers(u);
      if (s?.[0]) { setSett(s[0]); setSR(s[0].irs_rate.toString()); setSA(s[0].pay_period_anchor); setAutoEmail(s[0].auto_email || ""); setAutoFreq(s[0].auto_freq || "biweekly"); }
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { if (!user) return; const i = setInterval(load, 15000); return () => clearInterval(i); }, [user, load]);

  // GPS
  useEffect(() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true }); }, []);

  const login = async () => { setAErr(""); if (!aName.trim() || aPin.length !== 4) { setAErr("Enter name and 4-digit PIN."); return; } try { const all = await api("yard_users?active=eq.true"); const f = all.find(u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin); if (!f) { setAErr("Name or PIN not found."); return; } setUser(f); show(`Welcome, ${f.name}!`); } catch (e) { setAErr("Connection error."); } };
  const signup = async () => { setAErr(""); if (!aName.trim() || !aEmail.trim() || aPin.length !== 4) { setAErr("Fill all fields."); return; } try { const ex = await api(`yard_users?email=eq.${encodeURIComponent(aEmail.toLowerCase().trim())}`); if (ex?.length) { setAErr("Email registered."); return; } const r = await api("yard_users", { method: "POST", body: JSON.stringify({ email: aEmail.toLowerCase().trim(), name: aName.trim(), pin: aPin, role: "user" }) }); if (r?.[0]) { setUser(r[0]); show(`Welcome!`); } } catch (e) { setAErr("Failed."); } };

  const logTrip = async () => { if (!fromId || !toId || fromId === toId) { show("Select two different projects"); return; } const fp = projs.find(p => p.id === fromId), tp = projs.find(p => p.id === toId); if (!fp?.address || !tp?.address) { show("Both need addresses"); return; } setCalc(true); try { const mi = await getRoute(fp.address, tp.address); if (!mi) { show("Couldn't calculate route"); setCalc(false); return; } const re = Math.round(mi * sett.irs_rate * 100) / 100; await api("trips", { method: "POST", body: JSON.stringify({ user_id: user.id, user_name: user.name, from_project_id: fp.id, from_project_name: fp.name, from_address: fp.address, to_project_id: tp.id, to_project_name: tp.name, to_address: tp.address, miles: mi, reimbursement: re, irs_rate: sett.irs_rate, note: tNote, trip_date: td() }) }); await load(); setFI(toId); setTI(""); setTN(""); show(`${mi} mi — $${re.toFixed(2)}`); } catch (e) { show("Error"); } setCalc(false); };
  const saveProj = async () => { if (!nPN.trim() || !nPA.trim()) { show("Need name + address"); return; } try { await api("projects", { method: "POST", body: JSON.stringify({ name: nPN.trim(), address: nPA.trim() }) }); await load(); setPM(false); setNPN(""); setNPA(""); show("Added"); } catch (e) { show("Error"); } };
  const togProj = async (id, a) => { try { await api(`projects?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Archived" : "Restored"); } catch (e) { show("Error"); } };
  const saveSett = async () => { try { await api(`mileage_settings?id=eq.${sett.id}`, { method: "PATCH", body: JSON.stringify({ irs_rate: parseFloat(sRate) || 0.70, pay_period_anchor: sAnch }) }); await load(); show("Saved"); } catch (e) { show("Error"); } };
  const appTrip = async (id) => { try { await api(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) }); await load(); show("Approved"); } catch (e) { show("Error"); } };
  const rejTrip = async (id) => { try { await api(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }); await load(); show("Rejected"); } catch (e) { show("Error"); } };
  const delTrip = async (id) => { try { await api(`trips?id=eq.${id}`, { method: "DELETE" }); await load(); show("Deleted"); } catch (e) { show("Error"); } };
  const togUser = async (id, a) => { try { await api(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Deactivated" : "Activated"); } catch (e) { show("Error"); } };
  const chRole = async (id, r) => { try { await api(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ role: r }) }); await load(); show("Updated"); } catch (e) { show("Error"); } };

  const loadMap = async () => { setML(true); const pins = []; for (const p of projs.filter(p => p.address && p.active !== false)) { try { const g = await geocode(p.address); if (g) pins.push({ ...p, ...g }); await new Promise(r => setTimeout(r, 1100)); } catch (e) {} } setMP(pins); setML(false); };

  // Derived
  const my = trips.filter(t => t.user_id === user?.id);
  const pp = getPP(td(), sett.pay_period_anchor);
  const mo = getMonth(td());
  const tdTrips = my.filter(t => t.trip_date === td());
  const ppTrips = my.filter(t => t.trip_date >= pp.s && t.trip_date <= pp.e);
  const moTrips = my.filter(t => t.trip_date >= mo.s && t.trip_date <= mo.e);
  const ytdTrips = my.filter(t => t.trip_date >= `${yr()}-01-01`);
  const sum = arr => arr.reduce((s, t) => s + +t.miles, 0);

  // Report data
  const rTrips = trips.filter(t => { if (rEmp !== "all" && t.user_id !== rEmp) return false; if (rPer === "current") return t.trip_date >= pp.s && t.trip_date <= pp.e; if (rPer === "ytd") return t.trip_date >= `${yr()}-01-01`; if (rPer === "month") return t.trip_date >= mo.s && t.trip_date <= mo.e; return true; });
  const empSummary = () => { const m = {}; rTrips.forEach(t => { if (!m[t.user_id]) m[t.user_id] = { name: t.user_name, id: t.user_id, mi: 0, re: 0, ct: 0 }; m[t.user_id].mi += +t.miles; m[t.user_id].re += +t.reimbursement; m[t.user_id].ct++; }); return Object.values(m).sort((a, b) => a.name.localeCompare(b.name)); };

  const makeCSV = (tList, empName) => {
    const rows = [[empName ? `${empName} — Mileage Report` : "All Employees — Mileage Report"], [`Period: ${rPer}`], [`IRS Rate: $${sett.irs_rate}/mile`], [], ["Date", "Employee", "From", "To", "Miles", "Rate", "Reimbursement", "Status"]];
    tList.forEach(t => rows.push([t.trip_date, t.user_name, t.from_project_name, t.to_project_name, t.miles, `$${t.irs_rate}`, `$${(+t.reimbursement).toFixed(2)}`, t.status]));
    rows.push([]); rows.push(["TOTAL", "", "", "", tList.reduce((s, t) => s + +t.miles, 0).toFixed(1), "", `$${tList.reduce((s, t) => s + +t.reimbursement, 0).toFixed(2)}`, ""]);
    return rows.map(r => r.join(",")).join("\n");
  };
  const dlCSV = (csv, name) => { const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${name}-${td()}.csv`; a.click(); URL.revokeObjectURL(u); show("Downloaded"); };
  const emailCSV = (tList, empName) => {
    if (!emailTo.trim()) return;
    const lines = [empName ? `${empName} — Mileage Report` : "All Employees — Mileage Report", `Period: ${rPer}`, `Total Miles: ${tList.reduce((s, t) => s + +t.miles, 0).toFixed(1)}`, `Reimbursement: $${tList.reduce((s, t) => s + +t.reimbursement, 0).toFixed(2)}`, `Trips: ${tList.length}`, `Rate: $${sett.irs_rate}/mi`, "", "--- Trips ---"];
    tList.forEach(t => lines.push(`${t.trip_date} | ${t.user_name} | ${t.from_project_name} > ${t.to_project_name} | ${(+t.miles).toFixed(1)} mi | $${(+t.reimbursement).toFixed(2)}`));
    window.open(`mailto:${emailTo.trim()}?subject=${encodeURIComponent(`Mileage Report - ${td()}`)}&body=${encodeURIComponent(lines.join("\n"))}`);
    setEM(false); show(`Opening email`);
  };

  const css = `@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}input:focus,select:focus{border-color:${C.r}!important}`;

  // ═══ AUTH ═══
  if (!user) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: F.b }}><style>{css}</style>
    <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", height: 4, borderRadius: 4, overflow: "hidden", marginBottom: 28 }}><div style={{ flex: 1, background: C.tn }} /><div style={{ flex: 1, background: C.r }} /><div style={{ flex: 1, background: C.bk }} /></div>
      <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ display: "inline-flex" }}><Logo /></div><p style={{ fontSize: 13, color: C.m, marginTop: 8 }}>Outdoor Living — Mileage Tracker</p></div>
      <div style={{ display: "flex", background: C.bdL, borderRadius: 10, padding: 3, marginBottom: 24 }}>
        {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setAErr(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: mode === m ? "#fff" : "transparent", color: mode === m ? C.tx : C.l, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F.b, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
      </div>
      {mode === "signup" && <><Fl l="Your Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" /></Fl><Fl l="Email"><input style={iS} type="email" value={aEmail} onChange={e => setAE(e.target.value)} placeholder="you@email.com" /></Fl><Fl l="Create 4-digit PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" /></Fl>{aErr && <div style={{ color: C.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={signup}>Create Account</Btn></>}
      {mode === "login" && <><Fl l="Your Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" onKeyDown={e => { if (e.key === "Enter") document.getElementById("pin")?.focus(); }} /></Fl><Fl l="4-digit PIN"><input id="pin" style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter" && aPin.length === 4) login(); }} /></Fl>{aErr && <div style={{ color: C.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={login}>Enter Mileage Tracker</Btn></>}
    </div>
  </div>;

  if (!loaded) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.m, color: C.l }}><style>{css}</style>Loading...</div>;

  // ═══ MAIN ═══
  return <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.b, paddingBottom: 80 }}><style>{css}</style>
    <div style={{ padding: "14px 16px", background: "#fff", borderBottom: `1px solid ${C.bd}`, borderTop: `3px solid ${C.tn}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Logo />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.l, fontFamily: F.m }}>{user.name}</span>
        <button onClick={() => { setUser(null); setAN(""); setAP(""); }} style={{ background: C.tB, border: "none", cursor: "pointer", color: C.m, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontFamily: F.m, fontWeight: 600 }}>Log Out</button>
      </div>
    </div>
    <div style={{ padding: "16px 16px 0" }}>

      {/* ═══ LOG TRIP ═══ */}
      {tab === "log" && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Log Trip</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
          {[{ l: "Today", v: sum(tdTrips), b: C.tn }, { l: "Pay Period", v: sum(ppTrips), b: C.r }, { l: "Month", v: sum(moTrips), b: C.am }, { l: "YTD", v: sum(ytdTrips), b: C.bk }].map(s =>
            <div key={s.l} style={{ background: "#fff", borderRadius: 10, padding: "10px 10px", border: `1px solid ${C.bd}`, borderLeft: `3px solid ${s.b}` }}>
              <div style={{ fontSize: 9, fontFamily: F.m, color: C.l, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.l}</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.h }}>{s.v.toFixed(1)}<span style={{ fontSize: 9, color: C.m }}> mi</span></div>
            </div>)}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.tn}`, marginBottom: 16 }}>
          <Fl l="From"><select value={fromId} onChange={e => setFI(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select project...</option>{projs.filter(p => p.address && p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>
          <div style={{ textAlign: "center", color: C.l, fontSize: 20, margin: "-4px 0 4px" }}>↓</div>
          <Fl l="To"><select value={toId} onChange={e => setTI(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select destination...</option>{projs.filter(p => p.address && p.active !== false && p.id !== fromId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>
          <Fl l="Note (optional)"><input style={iS} value={tNote} onChange={e => setTN(e.target.value)} placeholder="e.g. picking up materials" /></Fl>
          <Btn full disabled={!fromId || !toId || fromId === toId || calc} onClick={logTrip}>{calc ? "Calculating..." : "Log Trip"}</Btn>
        </div>
        {tdTrips.length > 0 && <><h3 style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Today ({sum(tdTrips).toFixed(1)} mi)</h3>{tdTrips.map(t => <div key={t.id} style={{ padding: "8px 14px", background: "#fff", borderRadius: 8, border: `1px solid ${C.bd}`, marginBottom: 4, display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13 }}>{t.from_project_name} → {t.to_project_name}</span><span style={{ fontWeight: 700, fontFamily: F.m, fontSize: 13 }}>{(+t.miles).toFixed(1)} mi</span></div>)}</>}
      </div>}

      {/* ═══ MY TRIPS (grouped by day) ═══ */}
      {tab === "trips" && <div style={{ animation: "fadeIn .3s ease" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>My Trips</h2>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.r}`, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>Pay Period</div><div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.h }}>{sum(ppTrips).toFixed(1)}</div><div style={{ fontSize: 12, color: C.g, fontFamily: F.m, fontWeight: 600 }}>${(sum(ppTrips) * sett.irs_rate).toFixed(2)}</div></div>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>Month</div><div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.h }}>{sum(moTrips).toFixed(1)}</div><div style={{ fontSize: 12, color: C.g, fontFamily: F.m, fontWeight: 600 }}>${(sum(moTrips) * sett.irs_rate).toFixed(2)}</div></div>
            <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>YTD</div><div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.h }}>{sum(ytdTrips).toFixed(1)}</div><div style={{ fontSize: 12, color: C.g, fontFamily: F.m, fontWeight: 600 }}>${(sum(ytdTrips) * sett.irs_rate).toFixed(2)}</div></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: C.l, fontFamily: F.m }}>{fD(pp.s)} – {fD(pp.e)} · ${sett.irs_rate}/mi</div>
        </div>
        {(() => { const days = groupByDay(my); return days.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.l, fontFamily: F.m }}>No trips yet</div> : days.map(d => <div key={d.date} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: C.tB, borderRadius: "12px 12px 0 0", borderBottom: `2px solid ${C.tn}` }}><span style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700 }}>{fD(d.date)}</span><span style={{ fontFamily: F.m, fontSize: 13 }}>{d.mi.toFixed(1)} mi · ${d.re.toFixed(2)}</span></div>
          {d.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${C.bd}`, borderTop: "none", borderRadius: i === d.trips.length - 1 ? "0 0 12px 12px" : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>{t.note && <div style={{ fontSize: 11, color: C.l, fontStyle: "italic" }}>{t.note}</div>}</div><div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}><div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.h }}>{(+t.miles).toFixed(1)} mi</div><div style={{ fontSize: 11, color: C.g, fontFamily: F.m }}>${(+t.reimbursement).toFixed(2)}</div></div></div>)}
        </div>); })()}
      </div>}

      {/* ═══ MAP ═══ */}
      {tab === "map" && <div style={{ animation: "fadeIn .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Map</h2>{!mapLoad && <Btn small color={C.bk} onClick={loadMap}>{mapPins.length ? "Refresh" : "Load Map"}</Btn>}</div>
        {mapLoad && <div style={{ padding: 40, textAlign: "center", color: C.m, fontFamily: F.m }}>Locating projects...</div>}
        {!mapLoad && mapPins.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.m }}>Tap "Load Map" to see projects</div>}
        {!mapLoad && mapPins.length > 0 && (() => {
          const allPts = [...mapPins.map(p => ({ lat: p.lat, lng: p.lng }))]; if (myLoc) allPts.push(myLoc);
          const lats = allPts.map(p => p.lat), lngs = allPts.map(p => p.lng);
          const mnLa = Math.min(...lats), mxLa = Math.max(...lats), mnLo = Math.min(...lngs), mxLo = Math.max(...lngs);
          const pd = Math.max((mxLa - mnLa) * 0.15, 0.01), pdL = Math.max((mxLo - mnLo) * 0.15, 0.01);
          const W = 600, HT = 400;
          const cLat = (mnLa + mxLa) / 2, cLng = (mnLo + mxLo) / 2;
          const sLat = (mxLa - mnLa) + pd * 2, sLng = (mxLo - mnLo) + pdL * 2;
          const toX = lng => ((lng - (cLng - sLng / 2)) / sLng) * W;
          const toY = lat => HT - ((lat - (cLat - sLat / 2)) / sLat) * HT;
          return <div>
            <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.bd}`, marginBottom: 8, position: "relative" }}>
              <iframe title="Map" width="100%" height="400" frameBorder="0" style={{ display: "block" }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${mnLo - pdL},${mnLa - pd},${mxLo + pdL},${mxLa + pd}&layer=mapnik`} />
              <svg viewBox={`0 0 ${W} ${HT}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {mapPins.map(p => <g key={p.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={() => setSelPin(selPin === p.id ? null : p.id)}>
                  <circle cx={toX(p.lng)} cy={toY(p.lat)} r={selPin === p.id ? 10 : 7} fill={C.r} stroke="#fff" strokeWidth="2.5" />
                  {selPin === p.id && <><rect x={toX(p.lng) - 60} y={toY(p.lat) - 32} width="120" height="22" rx="4" fill="rgba(0,0,0,0.85)" /><text x={toX(p.lng)} y={toY(p.lat) - 17} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily={F.m}>{p.name}</text></>}
                </g>)}
                {myLoc && <><circle cx={toX(myLoc.lng)} cy={toY(myLoc.lat)} r="8" fill="rgba(37,99,235,0.3)" stroke="none" /><circle cx={toX(myLoc.lng)} cy={toY(myLoc.lat)} r="5" fill="#2563eb" stroke="#fff" strokeWidth="2" /></>}
              </svg>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.l, fontFamily: F.m, marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: C.r }} />Projects</span>
              {myLoc && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />You</span>}
            </div>
            <div style={{ fontSize: 12, color: C.l, fontFamily: F.m }}>Tap a red dot to see project name</div>
          </div>;
        })()}
      </div>}

      {/* ═══ PROJECTS ═══ */}
      {tab === "projects" && <div style={{ animation: "fadeIn .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Projects</h2>{isA && <Btn small onClick={() => setPM(true)}>+ Add</Btn>}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{["active", "archived", "all"].map(f => <button key={f} onClick={() => setPF(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${pFilter === f ? C.tn : C.bd}`, background: pFilter === f ? C.tB : "#fff", color: pFilter === f ? C.bk : C.m, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>)}</div>
        {projs.filter(p => pFilter === "active" ? p.active !== false : pFilter === "archived" ? p.active === false : true).map(p => <div key={p.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${C.bd}`, marginBottom: 8, borderLeft: `3px solid ${p.active !== false ? C.tn : C.l}`, opacity: p.active !== false ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, color: C.l, marginTop: 2 }}>{p.address || "No address"}</div><div style={{ fontSize: 11, color: C.m, fontFamily: F.m, marginTop: 4 }}>{trips.filter(t => t.from_project_id === p.id || t.to_project_id === p.id).length} trips</div></div>
            {isA && <button onClick={() => togProj(p.id, p.active !== false)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: p.active !== false ? C.aB : C.gB, color: p.active !== false ? C.am : C.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{p.active !== false ? "Archive" : "Restore"}</button>}
          </div>
        </div>)}
      </div>}

      {/* ═══ ADMIN ═══ */}
      {tab === "admin" && isA && <div style={{ animation: "fadeIn .3s ease" }}>
        {/* Admin auth gate */}
        {!adminAuth && <div style={{ maxWidth: 340, margin: "40px auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Admin Access</h2>
          <Fl l="Name"><input style={iS} value={aaName} onChange={e => setAAN(e.target.value)} placeholder="Admin name" /></Fl>
          <Fl l="PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aaPin} onChange={e => setAAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter" && aaPin.length === 4) { if (aaName.toLowerCase() === user.name.toLowerCase() && aaPin === user.pin) { setAA(true); setAAE(""); } else setAAE("Invalid."); } }} /></Fl>
          {aaErr && <div style={{ color: C.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aaErr}</div>}
          <Btn full onClick={() => { if (aaName.toLowerCase() === user.name.toLowerCase() && aaPin === user.pin) { setAA(true); setAAE(""); } else setAAE("Invalid credentials."); }}>Unlock Admin</Btn>
        </div>}

        {adminAuth && adminPage === "hub" && <div>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>Admin</h2>
          {[{ k: "reports", l: "Reports", d: "View & send mileage reports", c: C.r }, { k: "settings", l: "Settings", d: "IRS rate, pay periods", c: C.tn }, { k: "users", l: "Employees", d: "Manage users & roles", c: C.bk }].map(p =>
            <button key={p.k} onClick={() => setAP2(p.k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "16px 20px", background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, borderLeft: `4px solid ${p.c}`, marginBottom: 10, cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.l}</div>
              <div style={{ fontSize: 13, color: C.l, marginTop: 4 }}>{p.d}</div>
            </button>)}
        </div>}

        {/* ═══ ADMIN > REPORTS ═══ */}
        {adminAuth && adminPage === "reports" && <div>
          <button onClick={() => { setAP2("hub"); setRED(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Back to Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Reports</h2>

          {!rEmpDetail && <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select value={rPer} onChange={e => setRP(e.target.value)} style={{ ...iS, flex: 1 }}>
                <option value="current">Current Pay Period</option>
                <option value="month">This Month</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <h3 style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Employees</h3>
            {empSummary().map(e => <button key={e.id} onClick={() => setRED(e.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${C.bd}`, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div><div style={{ fontSize: 12, color: C.l, fontFamily: F.m, marginTop: 2 }}>{e.ct} trips</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 700, fontFamily: F.h }}>{e.mi.toFixed(1)} mi</div><div style={{ fontSize: 13, color: C.g, fontFamily: F.m }}>${e.re.toFixed(2)}</div></div>
              </div>
            </button>)}
            {empSummary().length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.l, fontFamily: F.m }}>No trips in this period</div>}

            <div style={{ marginTop: 16 }}>
              <Btn small color={C.bk} onClick={() => dlCSV(makeCSV(rTrips, null), "all-employees")}>Download All (CSV)</Btn>
            </div>
          </>}

          {/* Employee detail */}
          {rEmpDetail && (() => {
            const empTrips = rTrips.filter(t => t.user_id === rEmpDetail);
            const empName = empTrips[0]?.user_name || "Employee";
            const empMi = empTrips.reduce((s, t) => s + +t.miles, 0);
            const empRe = empTrips.reduce((s, t) => s + +t.reimbursement, 0);
            const days = groupByDay(empTrips);
            return <div>
              <button onClick={() => setRED(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: F.b }}>← All Employees</button>
              <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.r}`, marginBottom: 16 }}>
                <div style={{ fontFamily: F.h, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{empName}</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>Miles</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h }}>{empMi.toFixed(1)}</div></div>
                  <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>Reimb</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h, color: C.g }}>${empRe.toFixed(2)}</div></div>
                  <div><div style={{ fontSize: 10, fontFamily: F.m, color: C.l, textTransform: "uppercase" }}>Trips</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h }}>{empTrips.length}</div></div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Btn small color={C.bk} onClick={() => dlCSV(makeCSV(empTrips, empName), empName)}>Download CSV</Btn>
                <Btn small onClick={() => { setET(""); setEM(true); }}>Email Report</Btn>
              </div>

              {days.map(d => <div key={d.date} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: C.tB, borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.tn}` }}><span style={{ fontFamily: F.h, fontSize: 13, fontWeight: 700 }}>{fD(d.date)}</span><span style={{ fontFamily: F.m, fontSize: 12 }}>{d.mi.toFixed(1)} mi · ${d.re.toFixed(2)}</span></div>
                {d.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${C.bd}`, borderTop: "none", borderRadius: i === d.trips.length - 1 ? "0 0 10px 10px" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontFamily: F.h, fontSize: 14 }}>{(+t.miles).toFixed(1)} mi</span>
                      <span style={{ fontSize: 11, color: C.g, fontFamily: F.m, marginLeft: 8 }}>${(+t.reimbursement).toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {t.status === "logged" && <><Btn small color={C.g} onClick={() => appTrip(t.id)} sx={{ flex: 1 }}>Approve</Btn><Btn small color={C.r} onClick={() => rejTrip(t.id)} sx={{ flex: 1 }}>Reject</Btn></>}
                    <span style={{ fontSize: 10, fontFamily: F.m, padding: "2px 8px", borderRadius: 4, background: t.status === "approved" ? C.gB : t.status === "rejected" ? C.rB : C.aB, color: t.status === "approved" ? C.g : t.status === "rejected" ? C.r : C.am, alignSelf: "center" }}>{t.status}</span>
                    <button onClick={() => delTrip(t.id)} style={{ fontSize: 10, color: C.l, background: "none", border: "none", cursor: "pointer", fontFamily: F.m, marginLeft: "auto" }}>Delete</button>
                  </div>
                </div>)}
              </div>)}
            </div>;
          })()}
        </div>}

        {/* ═══ ADMIN > SETTINGS ═══ */}
        {adminAuth && adminPage === "settings" && <div>
          <button onClick={() => setAP2("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Back to Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Settings</h2>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${C.r}` }}>
            <h3 style={{ fontSize: 13, fontFamily: F.m, margin: "0 0 12px" }}>IRS RATE</h3>
            <Fl l="$/mile"><input style={iS} type="number" step="0.01" value={sRate} onChange={e => setSR(e.target.value)} /></Fl>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${C.tn}` }}>
            <h3 style={{ fontSize: 13, fontFamily: F.m, margin: "0 0 12px" }}>PAY PERIOD</h3>
            <Fl l="Anchor Date"><input style={iS} type="date" value={sAnch} onChange={e => setSA(e.target.value)} /></Fl>
          </div>
          <Btn full onClick={saveSett}>Save Settings</Btn>
        </div>}

        {/* ═══ ADMIN > EMPLOYEES ═══ */}
        {adminAuth && adminPage === "users" && <div>
          <button onClick={() => setAP2("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: C.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Back to Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Employees</h2>
          {users.map(u => { const canE = ROLES[user.role] > ROLES[u.role] || user.role === "super_admin"; const self = u.id === user.id;
            return <div key={u.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${C.bd}`, marginBottom: 8, borderLeft: `3px solid ${u.active ? C.g : C.l}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontWeight: 600, fontSize: 15, color: u.active ? C.tx : C.l }}>{u.name} {self && <span style={{ fontSize: 11, color: C.l }}>(you)</span>}</div><div style={{ fontSize: 11, fontFamily: F.m, color: C.l }}>{u.email} · <span style={{ color: C.r }}>{RL[u.role]}</span></div></div>
                {canE && !self && <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <select value={u.role} onChange={e => chRole(u.id, e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.bd}`, fontFamily: F.m }}><option value="user">Employee</option><option value="admin">Admin</option>{isS && <option value="senior_admin">Sr Admin</option>}</select>
                  <button onClick={() => togUser(u.id, u.active)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: u.active ? C.rB : C.gB, color: u.active ? C.r : C.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{u.active ? "Deactivate" : "Activate"}</button>
                </div>}
              </div>
            </div>; })}
        </div>}
      </div>}
    </div>

    {/* Modals */}
    <Modal open={projMod} onClose={() => setPM(false)} title="Add Project">
      <Fl l="Name"><input style={iS} value={nPN} onChange={e => setNPN(e.target.value)} placeholder="e.g. Henderson Patio" /></Fl>
      <Fl l="Address (required)"><input style={iS} value={nPA} onChange={e => setNPA(e.target.value)} placeholder="4521 Elm St, Denver, CO" /></Fl>
      <div style={{ fontSize: 12, color: C.am, marginBottom: 12, fontFamily: F.m }}>Full address needed for mileage calc.</div>
      <Btn full disabled={!nPN.trim() || !nPA.trim()} onClick={saveProj}>Add Project</Btn>
    </Modal>

    <Modal open={emailMod} onClose={() => setEM(false)} title="Email Report">
      <Fl l="Send to"><input style={iS} type="email" value={emailTo} onChange={e => setET(e.target.value)} placeholder="payroll@masterpiecelv.com" /></Fl>
      <div style={{ fontSize: 12, color: C.l, fontFamily: F.m, marginBottom: 16 }}>Opens your email app with report pre-filled.</div>
      <Btn full disabled={!emailTo.trim()} onClick={() => { const empTrips = rEmpDetail ? rTrips.filter(t => t.user_id === rEmpDetail) : rTrips; const empName = rEmpDetail ? empTrips[0]?.user_name : null; emailCSV(empTrips, empName); }}>Send Report</Btn>
    </Modal>

    <Nav tab={tab} set={t => { setTab(t); if (t !== "admin") { setAP2("hub"); setAA(false); setAAN(""); setAAP(""); } }} isAdmin={isA} />
    <Toast msg={toast.m} show={toast.s} />
  </div>;
}

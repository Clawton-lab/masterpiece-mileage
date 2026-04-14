import { useState, useEffect, useCallback, useRef } from "react";

const SB = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";
const HD = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function db(p, o = {}) { const r = await fetch(`${SB}/rest/v1/${p}`, { headers: HD, ...o }); const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : []; }
const GKEY = "AIzaSyA9lybyfoZastF08KYWSbyES1JLiwa07bA";
async function geo(a) { try { const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(a)}&key=${GKEY}`); const d = await r.json(); return d.status === "OK" && d.results?.length ? { lat: d.results[0].geometry.location.lat, lng: d.results[0].geometry.location.lng } : null; } catch (e) { return null; } }
async function getRoute(f, t) { try { const a = await geo(f), b = await geo(t); if (!a || !b) return null; const r = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&key=${GKEY}`); const d = await r.json(); return d.status === "OK" && d.routes?.length ? Math.round(d.routes[0].legs[0].distance.value * 0.000621371 * 10) / 10 : null; } catch (e) { return null; } }

function getPP(d, a) { const dt = new Date(d), an = new Date(a), df = Math.floor((dt - an) / 1209600000); const s = new Date(an.getTime() + df * 1209600000), e = new Date(s.getTime() + 1123200000); if (dt < s) { s.setTime(s.getTime() - 1209600000); e.setTime(e.getTime() - 1209600000); } return { s: s.toISOString().slice(0, 10), e: e.toISOString().slice(0, 10) }; }
function getMo(d) { const x = new Date(d + "T12:00:00"); return { s: new Date(x.getFullYear(), x.getMonth(), 1).toISOString().slice(0, 10), e: new Date(x.getFullYear(), x.getMonth() + 1, 0).toISOString().slice(0, 10) }; }
function fD(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function td() { return new Date().toISOString().slice(0, 10); }
function yr() { return new Date().getFullYear(); }
function sum(a) { return a.reduce((s, t) => s + +t.miles, 0); }
function sumR(a) { return a.reduce((s, t) => s + +t.reimbursement, 0); }
function grpDay(list) { const d = {}; list.forEach(t => { if (!d[t.trip_date]) d[t.trip_date] = []; d[t.trip_date].push(t); }); return Object.keys(d).sort((a, b) => b.localeCompare(a)).map(k => ({ date: k, trips: d[k], mi: sum(d[k]), re: sumR(d[k]) })); }
function notifyAdmin(email, subj, body) { if (!email) return; window.open(`mailto:${email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`, "_blank"); }

const RO = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RL = { super_admin: "Owner", senior_admin: "Sr Admin", admin: "Admin", user: "Employee" };
const P = { bg: "#faf8f5", c: "#fff", bd: "#e5e0d8", bdL: "#f0ece6", tx: "#1a1a1a", m: "#6b6560", l: "#9c9590", r: "#c41e2a", rB: "rgba(196,30,42,0.06)", tn: "#c4b59a", tB: "rgba(196,181,154,0.12)", bk: "#1a1a1a", g: "#16a34a", gB: "rgba(22,163,74,0.08)", am: "#d97706", aB: "rgba(217,119,6,0.08)" };
const F = { h: "'Bitter',serif", b: "'Source Sans 3',sans-serif", m: "'IBM Plex Mono',monospace" };
const iS = { width: "100%", padding: "12px 14px", background: "#fff", border: `1.5px solid ${P.bd}`, borderRadius: 10, color: P.tx, fontSize: 15, fontFamily: F.b, outline: "none", boxSizing: "border-box" };

function Logo() { return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width="38" height="38" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff" stroke={P.bd} strokeWidth="1.5" /><path d="M30 78 C30 78,28 55,32 40 C36 25,38 20,36 15" fill="none" stroke={P.tn} strokeWidth="6" strokeLinecap="round" /><path d="M38 78 C38 78,36 50,42 35 C48 20,50 14,47 8" fill="none" stroke={P.r} strokeWidth="6.5" strokeLinecap="round" /><path d="M44 80 L44 30 L58 55 L72 22 L72 80" fill="none" stroke={P.bk} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg><div><div style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Masterpiece</div><div style={{ fontSize: 8, fontFamily: F.m, color: P.r, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Mileage Tracker</div></div></div>; }
function Modal({ open, onClose, title, children }) { if (!open) return null; return <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} /><div style={{ position: "relative", background: P.c, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "20px 20px 32px", animation: "slideUp .3s ease" }}><div style={{ width: 40, height: 4, background: P.bd, borderRadius: 2, margin: "0 auto 16px" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: F.h }}>{title}</h2><button onClick={onClose} style={{ background: "none", border: "none", color: P.l, cursor: "pointer", fontSize: 20 }}>✕</button></div>{children}</div></div>; }
function Fl({ l, children }) { return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.m, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: F.m }}>{l}</label>{children}</div>; }
function Btn({ children, onClick, color = P.r, full, disabled, small, sx }) { return <button onClick={disabled ? undefined : onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: small ? "8px 14px" : "12px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: F.b, opacity: disabled ? 0.4 : 1, width: full ? "100%" : "auto", ...sx }}>{children}</button>; }
function Toast({ msg, show }) { return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, background: P.r, color: "#fff", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, opacity: show ? 1 : 0, transition: "all .3s", pointerEvents: "none", zIndex: 9999, maxWidth: "90%", textAlign: "center", fontFamily: F.b }}>{msg}</div>; }

function Nav({ tab, set, isAdmin }) {
  const ts = [{ k: "log", l: "Log Trip" }, { k: "trips", l: "My Trips" }, { k: "map", l: "Map" }, { k: "projects", l: "Projects" }];
  if (isAdmin) ts.push({ k: "admin", l: "Admin" });
  return <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#fff", borderTop: `2px solid ${P.tn}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom,8px)" }}>
    {ts.map(t => <button key={t.k} onClick={() => set(t.k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: tab === t.k ? P.r : P.l, borderTop: tab === t.k ? `2px solid ${P.r}` : "2px solid transparent", marginTop: -2 }}><span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.m }}>{t.l}</span></button>)}
  </nav>;
}

// ── LEAFLET MAP COMPONENT ──
function LeafletMap({ pins, myLoc, onSelectPin }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const L = window.L;
    if (!L) return;
    const center = pins.length ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length] : [39.5, -105.0];
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "" }).addTo(map);
    mapRef.current = map;

    // Fit bounds
    if (pins.length > 1) {
      const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
      if (myLoc) bounds.extend([myLoc.lat, myLoc.lng]);
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Red pin icon
    const redIcon = L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#c41e2a;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    const blueIcon = L.divIcon({ className: "", html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

    pins.forEach(p => {
      const m = L.marker([p.lat, p.lng], { icon: redIcon }).addTo(map);
      m.on("click", () => onSelectPin(p));
      markersRef.current.push(m);
    });

    if (myLoc) {
      const m = L.marker([myLoc.lat, myLoc.lng], { icon: blueIcon }).addTo(map);
      m.bindPopup("You are here");
      markersRef.current.push(m);
    }

    if (pins.length > 1) {
      const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
      if (myLoc) bounds.extend([myLoc.lat, myLoc.lng]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [pins, myLoc, onSelectPin]);

  return <div ref={ref} style={{ width: "100%", height: 400, borderRadius: 16, overflow: "hidden", border: `1px solid ${P.bd}` }} />;
}

export default function App() {
  const [user, setUser] = useState(null); const [mode, setMode] = useState("login");
  const [aName, setAN] = useState(""); const [aPin, setAP] = useState(""); const [aEmail, setAE] = useState(""); const [aErr, setAErr] = useState("");
  const [projs, setProjs] = useState([]); const [trips, setTrips] = useState([]); const [sett, setSett] = useState({ irs_rate: 0.70, pay_period_anchor: "2026-01-06" }); const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("log"); const [fromId, setFI] = useState(""); const [toId, setTI] = useState(""); const [tNote, setTN] = useState(""); const [tDate, setTD] = useState(td()); const [calc, setCalc] = useState(false);
  const [toast, setToast] = useState({ m: "", s: false }); const [loaded, setLoaded] = useState(false);
  const [mapPins, setMP] = useState([]); const [mapLoad, setML] = useState(false); const [myLoc, setMyLoc] = useState(null); const [selPin, setSP] = useState(null);
  const [pFilter, setPF] = useState("active"); const [projMod, setPM] = useState(false); const [nPN, setNPN] = useState(""); const [nPA, setNPA] = useState("");
  const [adPg, setAdPg] = useState("hub"); const [adAuth, setAdAuth] = useState(false);
  const [aaName, setAAN] = useState(""); const [aaPin, setAAP] = useState(""); const [aaErr, setAAE] = useState("");
  const [rPer, setRP] = useState("current"); const [rEmpDet, setRED] = useState(null);
  const [emailMod, setEM] = useState(false); const [emailTo, setET] = useState("");
  const [sRate, setSR] = useState(""); const [sAnch, setSA] = useState("");
  const [editUser, setEU] = useState(null); const [euN, setEUN] = useState(""); const [euE, setEUE] = useState(""); const [euP, setEUP] = useState("");
  const [delUserMod, setDUM] = useState(null);
  const [leafReady, setLR] = useState(false);

  const show = useCallback(m => { setToast({ m, s: true }); setTimeout(() => setToast(t => ({ ...t, s: false })), 2800); }, []);
  const isA = user && RO[user.role] >= 2;
  const isS = user && RO[user.role] >= 3;
  const adminEmail = users.find(u => u.role === "super_admin")?.email || "";

  // Load Leaflet CSS/JS
  useEffect(() => {
    if (document.getElementById("leaflet-css")) { setLR(true); return; }
    const css = document.createElement("link"); css.id = "leaflet-css"; css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload = () => setLR(true); document.head.appendChild(js);
  }, []);

  const load = useCallback(async () => {
    try { const [p, t, s, u] = await Promise.all([db("projects?order=name"), db("trips?order=trip_date.desc,created_at.desc&limit=1000"), db("mileage_settings?limit=1"), db("yard_users?order=name")]); setProjs(p); setTrips(t); setUsers(u); if (s?.[0]) { setSett(s[0]); setSR(s[0].irs_rate.toString()); setSA(s[0].pay_period_anchor); } } catch (e) { console.error(e); } setLoaded(true);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { if (!user) return; const i = setInterval(load, 15000); return () => clearInterval(i); }, [user, load]);
  useEffect(() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true }); }, []);

  const login = async () => { setAErr(""); if (!aName.trim() || aPin.length !== 4) { setAErr("Enter name and 4-digit PIN."); return; } try { const all = await db("yard_users?active=eq.true"); const f = all.find(u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin); if (!f) { setAErr("Name or PIN not found."); return; } setUser(f); show(`Welcome, ${f.name}!`); } catch (e) { setAErr("Connection error."); } };
  const signup = async () => { setAErr(""); if (!aName.trim() || !aEmail.trim() || aPin.length !== 4) { setAErr("Fill all fields."); return; } try { const ex = await db(`yard_users?email=eq.${encodeURIComponent(aEmail.toLowerCase().trim())}`); if (ex?.length) { setAErr("Email registered."); return; } const r = await db("yard_users", { method: "POST", body: JSON.stringify({ email: aEmail.toLowerCase().trim(), name: aName.trim(), pin: aPin, role: "user" }) }); if (r?.[0]) { setUser(r[0]); show(`Welcome!`); } } catch (e) { setAErr("Failed."); } };

  const logTrip = async () => {
    if (!fromId || !toId || fromId === toId) { show("Select two different projects"); return; }
    const fp = projs.find(p => p.id === fromId), tp = projs.find(p => p.id === toId);
    if (!fp?.address || !tp?.address) { show("Both need addresses"); return; }
    setCalc(true);
    try {
      const mi = await getRoute(fp.address, tp.address);
      if (!mi) { show("Couldn't calculate route"); setCalc(false); return; }
      const re = Math.round(mi * sett.irs_rate * 100) / 100;
      await db("trips", { method: "POST", body: JSON.stringify({ user_id: user.id, user_name: user.name, from_project_id: fp.id, from_project_name: fp.name, from_address: fp.address, to_project_id: tp.id, to_project_name: tp.name, to_address: tp.address, miles: mi, reimbursement: re, irs_rate: sett.irs_rate, note: tNote, trip_date: tDate }) });
      // If date is NOT today, notify admin
      if (tDate !== td() && adminEmail) {
        notifyAdmin(adminEmail, `Trip logged for different date — verify`, `${user.name} logged a trip on ${td()} for ${tDate}\n${fp.name} → ${tp.name}\n${mi} miles / $${re.toFixed(2)}\n\nPlease verify this trip.`);
      }
      await load(); setFI(toId); setTI(""); setTN(""); setTD(td());
      show(`${mi} mi — $${re.toFixed(2)}`);
    } catch (e) { show("Error"); }
    setCalc(false);
  };

  const saveProj = async () => { if (!nPN.trim()) return; try { await db("projects", { method: "POST", body: JSON.stringify({ name: nPN.trim(), address: nPA.trim() }) }); await load(); setPM(false); setNPN(""); setNPA(""); show("Added"); } catch (e) { show("Error"); } };
  const togProj = async (id, a) => { try { await db(`projects?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Archived" : "Restored"); } catch (e) { show("Error"); } };
  const saveSett = async () => { try { await db(`mileage_settings?id=eq.${sett.id}`, { method: "PATCH", body: JSON.stringify({ irs_rate: parseFloat(sRate) || 0.70, pay_period_anchor: sAnch }) }); await load(); show("Saved"); } catch (e) { show("Error"); } };
  const appTrip = async id => { try { await db(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) }); await load(); show("Approved"); } catch (e) { show("Error"); } };
  const rejTrip = async id => { try { await db(`trips?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }); await load(); show("Rejected"); } catch (e) { show("Error"); } };
  const delTrip = async id => { try { await db(`trips?id=eq.${id}`, { method: "DELETE" }); await load(); show("Deleted"); } catch (e) { show("Error"); } };
  const togUser = async (id, a) => { try { await db(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Deactivated" : "Activated"); } catch (e) { show("Error"); } };
  const chRole = async (id, r) => { try { await db(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ role: r }) }); await load(); show("Updated"); } catch (e) { show("Error"); } };
  const saveEU = async () => { if (!euN.trim() || !euE.trim() || euP.length !== 4) { show("Fill all fields"); return; } try { await db(`yard_users?id=eq.${editUser}`, { method: "PATCH", body: JSON.stringify({ name: euN.trim(), email: euE.toLowerCase().trim(), pin: euP }) }); await load(); setEU(null); show("Updated"); } catch (e) { show("Error"); } };
  const delUser = async (id) => { try { await db(`yard_users?id=eq.${id}`, { method: "DELETE" }); await load(); setDUM(null); show("Employee deleted"); } catch (e) { show("Error deleting"); } };

  const loadMap = async () => { setML(true); const pins = []; for (const p of projs.filter(p => p.address && p.active !== false)) { try { const g = await geo(p.address); if (g) pins.push({ ...p, ...g }); await new Promise(r => setTimeout(r, 1100)); } catch {} } setMP(pins); setML(false); };

  const my = trips.filter(t => t.user_id === user?.id);
  const pp = getPP(td(), sett.pay_period_anchor); const mo = getMo(td());
  const tdT = my.filter(t => t.trip_date === td()); const ppT = my.filter(t => t.trip_date >= pp.s && t.trip_date <= pp.e);
  const moT = my.filter(t => t.trip_date >= mo.s && t.trip_date <= mo.e); const ytdT = my.filter(t => t.trip_date >= `${yr()}-01-01`);

  const rTrips = trips.filter(t => { if (rPer === "current") return t.trip_date >= pp.s && t.trip_date <= pp.e; if (rPer === "month") return t.trip_date >= mo.s && t.trip_date <= mo.e; if (rPer === "ytd") return t.trip_date >= `${yr()}-01-01`; return true; });
  const empSum = () => { const m = {}; rTrips.forEach(t => { if (!m[t.user_id]) m[t.user_id] = { name: t.user_name, id: t.user_id, mi: 0, re: 0, ct: 0 }; m[t.user_id].mi += +t.miles; m[t.user_id].re += +t.reimbursement; m[t.user_id].ct++; }); return Object.values(m).sort((a, b) => a.name.localeCompare(b.name)); };
  const mkCSV = (tl, en) => { const r = [[en || "All Employees"], [`Period: ${rPer}`], [], ["Date", "Employee", "From", "To", "Miles", "Rate", "Reimb", "Status"]]; tl.forEach(t => r.push([t.trip_date, t.user_name, t.from_project_name, t.to_project_name, t.miles, `$${t.irs_rate}`, `$${(+t.reimbursement).toFixed(2)}`, t.status])); r.push([]); r.push(["TOTAL", "", "", "", sum(tl).toFixed(1), "", `$${sumR(tl).toFixed(2)}`]); return r.map(x => x.join(",")).join("\n"); };
  const dlCSV = (csv, n) => { const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${n}-${td()}.csv`; a.click(); URL.revokeObjectURL(u); show("Downloaded"); };
  const emailRpt = (tl, en) => { if (!emailTo.trim()) return; const ln = [en || "All Employees", `Period: ${rPer}`, `Miles: ${sum(tl).toFixed(1)}`, `Reimb: $${sumR(tl).toFixed(2)}`, "", "---"]; tl.forEach(t => ln.push(`${t.trip_date} | ${t.user_name} | ${t.from_project_name} > ${t.to_project_name} | ${(+t.miles).toFixed(1)} mi | $${(+t.reimbursement).toFixed(2)}`)); window.open(`mailto:${emailTo.trim()}?subject=${encodeURIComponent(`Mileage Report ${td()}`)}&body=${encodeURIComponent(ln.join("\n"))}`); setEM(false); show("Opening email"); };

  const css = `@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}input:focus,select:focus{border-color:${P.r}!important}`;

  if (!user) return <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: F.b }}><style>{css}</style>
    <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", height: 4, borderRadius: 4, overflow: "hidden", marginBottom: 28 }}><div style={{ flex: 1, background: P.tn }} /><div style={{ flex: 1, background: P.r }} /><div style={{ flex: 1, background: P.bk }} /></div>
      <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ display: "inline-flex" }}><Logo /></div></div>
      <div style={{ display: "flex", background: P.bdL, borderRadius: 10, padding: 3, marginBottom: 24 }}>
        {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setAErr(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: mode === m ? "#fff" : "transparent", color: mode === m ? P.tx : P.l, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F.b }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
      </div>
      {mode === "signup" && <><Fl l="Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" /></Fl><Fl l="Email"><input style={iS} type="email" value={aEmail} onChange={e => setAE(e.target.value)} /></Fl><Fl l="Create PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" /></Fl>{aErr && <div style={{ color: P.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={signup}>Create Account</Btn></>}
      {mode === "login" && <><Fl l="Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" onKeyDown={e => { if (e.key === "Enter") document.getElementById("pin")?.focus(); }} /></Fl><Fl l="PIN"><input id="pin" style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter" && aPin.length === 4) login(); }} /></Fl>{aErr && <div style={{ color: P.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={login}>Enter Mileage Tracker</Btn></>}
    </div></div>;

  if (!loaded) return <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.m, color: P.l }}><style>{css}</style>Loading...</div>;

  return <div style={{ minHeight: "100vh", background: P.bg, fontFamily: F.b, paddingBottom: 80 }}><style>{css}</style>
    <div style={{ padding: "14px 16px", background: "#fff", borderBottom: `1px solid ${P.bd}`, borderTop: `3px solid ${P.tn}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}><Logo /><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: P.l, fontFamily: F.m }}>{user.name}</span>{isA && <span style={{ background: P.rB, color: P.r, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: F.m }}>{RL[user.role]}</span>}<button onClick={() => { setUser(null); setAN(""); setAP(""); setAdAuth(false); setAdPg("hub"); }} style={{ background: P.tB, border: "none", cursor: "pointer", color: P.m, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontFamily: F.m, fontWeight: 600 }}>Log Out</button></div></div>
    <div style={{ padding: "16px 16px 0" }}>

      {/* ═══ LOG TRIP ═══ */}
      {tab === "log" && <div style={{ animation: "fadeIn .3s" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Log Trip</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
          {[{ l: "Today", v: sum(tdT), b: P.tn }, { l: "Pay Per.", v: sum(ppT), b: P.r }, { l: "Month", v: sum(moT), b: P.am }, { l: "YTD", v: sum(ytdT), b: P.bk }].map(s =>
            <div key={s.l} style={{ background: "#fff", borderRadius: 10, padding: 10, border: `1px solid ${P.bd}`, borderLeft: `3px solid ${s.b}` }}><div style={{ fontSize: 9, fontFamily: F.m, color: P.l, textTransform: "uppercase" }}>{s.l}</div><div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.h }}>{s.v.toFixed(1)}<span style={{ fontSize: 9, color: P.m }}> mi</span></div></div>)}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${P.bd}`, borderTop: `3px solid ${P.tn}`, marginBottom: 16 }}>
          <Fl l="Trip Date">
            <input type="date" style={iS} value={tDate} onChange={e => setTD(e.target.value)} />
            {tDate !== td() && <div style={{ fontSize: 12, color: P.am, fontFamily: F.m, marginTop: 4 }}>Different from today — admin will be notified to verify.</div>}
          </Fl>
          <Fl l="From"><select value={fromId} onChange={e => setFI(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select project...</option>{projs.filter(p => p.address && p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>
          <div style={{ textAlign: "center", color: P.l, fontSize: 20, margin: "-4px 0 4px" }}>↓</div>
          <Fl l="To"><select value={toId} onChange={e => setTI(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select destination...</option>{projs.filter(p => p.address && p.active !== false && p.id !== fromId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>
          <Fl l="Note (optional)"><input style={iS} value={tNote} onChange={e => setTN(e.target.value)} placeholder="e.g. picking up materials" /></Fl>
          <Btn full disabled={!fromId || !toId || fromId === toId || calc} onClick={logTrip}>{calc ? "Calculating..." : "Log Trip"}</Btn>
        </div>
      </div>}

      {/* ═══ MY TRIPS ═══ */}
      {tab === "trips" && <div style={{ animation: "fadeIn .3s" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>My Trips</h2>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${P.bd}`, borderTop: `3px solid ${P.r}`, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[{ l: "Pay Period", v: sum(ppT) }, { l: "Month", v: sum(moT) }, { l: "YTD", v: sum(ytdT) }].map(s =>
              <div key={s.l}><div style={{ fontSize: 10, fontFamily: F.m, color: P.l, textTransform: "uppercase" }}>{s.l}</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h }}>{s.v.toFixed(1)}</div><div style={{ fontSize: 12, color: P.g, fontFamily: F.m, fontWeight: 600 }}>${(s.v * sett.irs_rate).toFixed(2)}</div></div>)}
          </div>
        </div>
        {grpDay(my).map(d => <div key={d.date} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: P.tB, borderRadius: "12px 12px 0 0", borderBottom: `2px solid ${P.tn}` }}><span style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700 }}>{fD(d.date)}</span><span style={{ fontFamily: F.m, fontSize: 13 }}>{d.mi.toFixed(1)} mi · ${d.re.toFixed(2)}</span></div>
          {d.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${P.bd}`, borderTop: "none", borderRadius: i === d.trips.length - 1 ? "0 0 12px 12px" : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div>{t.note && <div style={{ fontSize: 11, color: P.l, fontStyle: "italic" }}>{t.note}</div>}</div><div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}><div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.h }}>{(+t.miles).toFixed(1)} mi</div><div style={{ fontSize: 11, color: P.g, fontFamily: F.m }}>${(+t.reimbursement).toFixed(2)}</div></div></div>)}
        </div>)}
        {!my.length && <div style={{ padding: 40, textAlign: "center", color: P.l, fontFamily: F.m }}>No trips yet</div>}
      </div>}

      {/* ═══ MAP (LEAFLET) ═══ */}
      {tab === "map" && <div style={{ animation: "fadeIn .3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Map</h2>{!mapLoad && <Btn small color={P.bk} onClick={loadMap}>{mapPins.length ? "Refresh" : "Load Map"}</Btn>}</div>
        {mapLoad && <div style={{ padding: 40, textAlign: "center", color: P.m, fontFamily: F.m }}>Locating projects...</div>}
        {!mapLoad && !mapPins.length && <div style={{ padding: 40, textAlign: "center", color: P.m }}>Tap "Load Map" to see projects</div>}
        {!mapLoad && mapPins.length > 0 && leafReady && <div>
          <LeafletMap pins={mapPins} myLoc={myLoc} onSelectPin={p => setSP(p)} />
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: P.l, fontFamily: F.m, marginTop: 8 }}><span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.r }} />Projects</span>{myLoc && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />You</span>}</div>
          {selPin && <div style={{ marginTop: 12, background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${P.bd}`, borderLeft: `4px solid ${P.r}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: F.h }}>{selPin.name}</div>
            <div style={{ fontSize: 13, color: P.m, marginTop: 4, fontFamily: F.m }}>{selPin.address}</div>
          </div>}
        </div>}
      </div>}

      {/* ═══ PROJECTS ═══ */}
      {tab === "projects" && <div style={{ animation: "fadeIn .3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Projects</h2>{isA && <Btn small onClick={() => setPM(true)}>+ Add</Btn>}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{["active", "archived", "all"].map(f => <button key={f} onClick={() => setPF(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${pFilter === f ? P.tn : P.bd}`, background: pFilter === f ? P.tB : "#fff", color: pFilter === f ? P.bk : P.m, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>)}</div>
        {projs.filter(p => pFilter === "active" ? p.active !== false : pFilter === "archived" ? p.active === false : true).map(p =>
          <div key={p.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, borderLeft: `3px solid ${p.active !== false ? P.tn : P.l}`, opacity: p.active !== false ? 1 : .6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, color: P.l }}>{p.address}</div></div>
              {isA && <button onClick={() => togProj(p.id, p.active !== false)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: p.active !== false ? P.aB : P.gB, color: p.active !== false ? P.am : P.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{p.active !== false ? "Archive" : "Restore"}</button>}</div>
          </div>)}
      </div>}

      {/* ═══ ADMIN ═══ */}
      {tab === "admin" && isA && <div style={{ animation: "fadeIn .3s" }}>
        {!adAuth && <div style={{ maxWidth: 340, margin: "40px auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Admin Access</h2>
          <Fl l="Name"><input style={iS} value={aaName} onChange={e => setAAN(e.target.value)} /></Fl>
          <Fl l="PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aaPin} onChange={e => setAAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter") { if (aaName.toLowerCase() === user.name.toLowerCase() && aaPin === user.pin) setAdAuth(true); else setAAE("Invalid."); } }} /></Fl>
          {aaErr && <div style={{ color: P.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aaErr}</div>}
          <Btn full onClick={() => { if (aaName.toLowerCase() === user.name.toLowerCase() && aaPin === user.pin) setAdAuth(true); else setAAE("Invalid."); }}>Unlock</Btn>
        </div>}

        {adAuth && adPg === "hub" && <div>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>Admin</h2>
          {[{ k: "reports", l: "Reports", d: "View & send mileage reports", c: P.r }, { k: "settings", l: "Settings", d: "IRS rate, pay periods", c: P.tn }, { k: "users", l: "Employees", d: "Manage team", c: P.bk }].map(p =>
            <button key={p.k} onClick={() => setAdPg(p.k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "16px 20px", background: "#fff", borderRadius: 14, border: `1px solid ${P.bd}`, borderLeft: `4px solid ${p.c}`, marginBottom: 10, cursor: "pointer", fontFamily: F.b }}><div style={{ fontWeight: 700, fontSize: 16 }}>{p.l}</div><div style={{ fontSize: 13, color: P.l, marginTop: 4 }}>{p.d}</div></button>)}
        </div>}

        {/* REPORTS */}
        {adAuth && adPg === "reports" && <div>
          <button onClick={() => { setAdPg("hub"); setRED(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Reports</h2>
          {!rEmpDet && <>
            <select value={rPer} onChange={e => setRP(e.target.value)} style={{ ...iS, marginBottom: 16 }}><option value="current">Current Pay Period</option><option value="month">This Month</option><option value="ytd">Year to Date</option><option value="all">All Time</option></select>
            {empSum().map(e => <button key={e.id} onClick={() => setRED(e.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, cursor: "pointer", fontFamily: F.b }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div><div style={{ fontSize: 12, color: P.l, fontFamily: F.m }}>{e.ct} trips</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 700, fontFamily: F.h }}>{e.mi.toFixed(1)} mi</div><div style={{ fontSize: 13, color: P.g, fontFamily: F.m }}>${e.re.toFixed(2)}</div></div></div></button>)}
            {!empSum().length && <div style={{ padding: 30, textAlign: "center", color: P.l, fontFamily: F.m }}>No trips</div>}
            <Btn small color={P.bk} onClick={() => dlCSV(mkCSV(rTrips), "all-employees")} sx={{ marginTop: 12 }}>Download All CSV</Btn>
          </>}
          {rEmpDet && (() => { const et = rTrips.filter(t => t.user_id === rEmpDet); const en = et[0]?.user_name || ""; const days = grpDay(et);
            return <div>
              <button onClick={() => setRED(null)} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: F.b }}>← All Employees</button>
              <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${P.bd}`, borderTop: `3px solid ${P.r}`, marginBottom: 16 }}>
                <div style={{ fontFamily: F.h, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{en}</div>
                <div style={{ display: "flex", gap: 20 }}><div><div style={{ fontSize: 10, fontFamily: F.m, color: P.l }}>MILES</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h }}>{sum(et).toFixed(1)}</div></div><div><div style={{ fontSize: 10, fontFamily: F.m, color: P.l }}>REIMB</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h, color: P.g }}>${sumR(et).toFixed(2)}</div></div><div><div style={{ fontSize: 10, fontFamily: F.m, color: P.l }}>TRIPS</div><div style={{ fontSize: 24, fontWeight: 700, fontFamily: F.h }}>{et.length}</div></div></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><Btn small color={P.bk} onClick={() => dlCSV(mkCSV(et, en), en)}>CSV</Btn><Btn small onClick={() => { setET(""); setEM(true); }}>Email</Btn></div>
              {days.map(d => <div key={d.date} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: P.tB, borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${P.tn}` }}><span style={{ fontFamily: F.h, fontSize: 13, fontWeight: 700 }}>{fD(d.date)}</span><span style={{ fontFamily: F.m, fontSize: 12 }}>{d.mi.toFixed(1)} mi · ${d.re.toFixed(2)}</span></div>
                {d.trips.map((t, i) => <div key={t.id} style={{ padding: "10px 14px", background: "#fff", border: `1px solid ${P.bd}`, borderTop: "none", borderRadius: i === d.trips.length - 1 ? "0 0 10px 10px" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.from_project_name} → {t.to_project_name}</div><div style={{ flexShrink: 0 }}><span style={{ fontWeight: 700, fontFamily: F.h }}>{(+t.miles).toFixed(1)} mi</span><span style={{ fontSize: 11, color: P.g, fontFamily: F.m, marginLeft: 6 }}>${(+t.reimbursement).toFixed(2)}</span></div></div>
                  {t.status === "logged" && <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small color={P.g} onClick={() => appTrip(t.id)} sx={{ flex: 1 }}>Approve</Btn><Btn small color={P.r} onClick={() => rejTrip(t.id)} sx={{ flex: 1 }}>Reject</Btn></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ fontSize: 10, fontFamily: F.m, padding: "1px 6px", borderRadius: 4, background: t.status === "approved" ? P.gB : t.status === "rejected" ? P.rB : P.aB, color: t.status === "approved" ? P.g : t.status === "rejected" ? P.r : P.am }}>{t.status}</span><button onClick={() => delTrip(t.id)} style={{ fontSize: 10, color: P.l, background: "none", border: "none", cursor: "pointer", fontFamily: F.m }}>Delete</button></div>
                </div>)}
              </div>)}
            </div>; })()}
        </div>}

        {/* SETTINGS */}
        {adAuth && adPg === "settings" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Settings</h2>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${P.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${P.r}` }}><Fl l="IRS Rate ($/mile)"><input style={iS} type="number" step="0.01" value={sRate} onChange={e => setSR(e.target.value)} /></Fl></div>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${P.bd}`, padding: 16, marginBottom: 16, borderTop: `3px solid ${P.tn}` }}><Fl l="Pay Period Anchor"><input style={iS} type="date" value={sAnch} onChange={e => setSA(e.target.value)} /></Fl></div>
          <Btn full onClick={saveSett}>Save</Btn>
        </div>}

        {/* EMPLOYEES */}
        {adAuth && adPg === "users" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Employees</h2>
          {users.map(u => { const canE = RO[user.role] > RO[u.role] || user.role === "super_admin"; const self = u.id === user.id;
            return <div key={u.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, borderLeft: `3px solid ${u.active ? P.g : P.l}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><div style={{ fontWeight: 600, fontSize: 15, color: u.active ? P.tx : P.l }}>{u.name} {self && <span style={{ fontSize: 11, color: P.l }}>(you)</span>}</div><div style={{ fontSize: 11, fontFamily: F.m, color: P.l }}>{u.email} · <span style={{ color: P.r }}>{RL[u.role]}</span></div></div>
                {canE && !self && <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <button onClick={() => { setEU(u.id); setEUN(u.name); setEUE(u.email); setEUP(u.pin); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${P.bd}`, background: "#fff", color: P.m, cursor: "pointer", fontFamily: F.m }}>Edit</button>
                  <select value={u.role} onChange={e => chRole(u.id, e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.bd}`, fontFamily: F.m }}><option value="user">Employee</option><option value="admin">Admin</option>{isS && <option value="senior_admin">Sr Admin</option>}</select>
                  <button onClick={() => togUser(u.id, u.active)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: u.active ? P.rB : P.gB, color: u.active ? P.r : P.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{u.active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => setDUM(u.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: P.r, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>Delete</button>
                </div>}
              </div>
            </div>; })}
        </div>}
      </div>}
    </div>

    {/* Modals */}
    <Modal open={projMod} onClose={() => setPM(false)} title="Add Project"><Fl l="Name"><input style={iS} value={nPN} onChange={e => setNPN(e.target.value)} placeholder="e.g. Henderson Patio" /></Fl><Fl l="Address"><input style={iS} value={nPA} onChange={e => setNPA(e.target.value)} placeholder="123 Main St, Denver, CO" /></Fl><Btn full disabled={!nPN.trim()} onClick={saveProj}>Add</Btn></Modal>
    <Modal open={emailMod} onClose={() => setEM(false)} title="Email Report"><Fl l="Send to"><input style={iS} type="email" value={emailTo} onChange={e => setET(e.target.value)} placeholder="payroll@masterpiecelv.com" /></Fl><Btn full disabled={!emailTo.trim()} onClick={() => { const et = rEmpDet ? rTrips.filter(t => t.user_id === rEmpDet) : rTrips; emailRpt(et, rEmpDet ? et[0]?.user_name : null); }}>Send</Btn></Modal>
    <Modal open={!!editUser} onClose={() => setEU(null)} title="Edit Employee"><Fl l="Name"><input style={iS} value={euN} onChange={e => setEUN(e.target.value)} /></Fl><Fl l="Email"><input style={iS} type="email" value={euE} onChange={e => setEUE(e.target.value)} /></Fl><Fl l="PIN"><input style={{ ...iS, textAlign: "center", fontSize: 20, letterSpacing: 10, fontFamily: F.m }} maxLength={4} value={euP} onChange={e => setEUP(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Fl><Btn full disabled={!euN.trim() || !euE.trim() || euP.length !== 4} onClick={saveEU}>Save</Btn></Modal>
    <Modal open={!!delUserMod} onClose={() => setDUM(null)} title="Delete Employee?">
      <p style={{ color: P.m, marginBottom: 20 }}>This will permanently remove <strong>{users.find(u => u.id === delUserMod)?.name}</strong> and all their data. This cannot be undone.</p>
      <div style={{ display: "flex", gap: 10 }}><button onClick={() => setDUM(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button><Btn full color={P.r} onClick={() => delUser(delUserMod)} sx={{ flex: 1 }}>Delete</Btn></div>
    </Modal>

    <Nav tab={tab} set={t => { setTab(t); if (t !== "admin") { setAdPg("hub"); setAdAuth(false); setAAN(""); setAAP(""); } }} isAdmin={isA} />
    <Toast msg={toast.m} show={toast.s} />
  </div>;
}

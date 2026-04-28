import { useState, useEffect, useCallback } from "react";

const SB = "https://lvhqfslhcpiwshgvrnlp.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aHFmc2xoY3Bpd3NoZ3ZybmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjU5MTMsImV4cCI6MjA5MTM0MTkxM30.2KDKoJeGpiKs_7lZwxW8TAcldvzM3WhimJfQYxyZ_c0";
const HD = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function api(p, o = {}) { const r = await fetch(`${SB}/rest/v1/${p}`, { headers: HD, ...o }); const t = await r.text(); if (!r.ok) throw new Error(t); return t ? JSON.parse(t) : []; }
async function searchHangers(q) { if (!q || q.length < 2) return []; const r = await api(`hanger_reference?or=(model.ilike.*${q}*,manufacturer.ilike.*${q}*)`); return r; }

const RO = { super_admin: 4, senior_admin: 3, admin: 2, user: 1 };
const RL = { super_admin: "Owner", senior_admin: "Sr Admin", admin: "Admin", user: "Employee" };
const UNITS = ["pcs", "SF", "LF", "bags", "boxes", "pallets", "rolls", "each"];
const CONDS = ["Good", "Fair", "Poor"];
const P = { bg: "#faf8f5", c: "#fff", bd: "#e5e0d8", bdL: "#f0ece6", tx: "#1a1a1a", m: "#6b6560", l: "#9c9590", r: "#c41e2a", rB: "rgba(196,30,42,0.06)", tn: "#c4b59a", tB: "rgba(196,181,154,0.12)", bk: "#1a1a1a", g: "#16a34a", gB: "rgba(22,163,74,0.08)", am: "#d97706", aB: "rgba(217,119,6,0.08)" };
const F = { h: "'Bitter',serif", b: "'Source Sans 3',sans-serif", m: "'IBM Plex Mono',monospace" };
const iS = { width: "100%", padding: "12px 14px", background: "#fff", border: `1.5px solid ${P.bd}`, borderRadius: 10, color: P.tx, fontSize: 15, fontFamily: F.b, outline: "none", boxSizing: "border-box" };

function gSt(q, t) { return q <= 0 ? "out" : q <= t ? "low" : "good"; }
function fD(d) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function fAgo(d) { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; }
const ST = { good: { l: "In Stock", c: P.g, b: P.gB }, low: { l: "Low Stock", c: P.am, b: P.aB }, out: { l: "Out", c: P.r, b: P.rB } };
const COND_C = { Good: P.g, Fair: P.am, Poor: P.r };

function Logo() { return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width="38" height="38" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff" stroke={P.bd} strokeWidth="1.5" /><path d="M30 78 C30 78,28 55,32 40 C36 25,38 20,36 15" fill="none" stroke={P.tn} strokeWidth="6" strokeLinecap="round" /><path d="M38 78 C38 78,36 50,42 35 C48 20,50 14,47 8" fill="none" stroke={P.r} strokeWidth="6.5" strokeLinecap="round" /><path d="M44 80 L44 30 L58 55 L72 22 L72 80" fill="none" stroke={P.bk} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg><div><div style={{ fontFamily: F.h, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Masterpiece</div><div style={{ fontSize: 8, fontFamily: F.m, color: P.r, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Material Yard & Tool Checkout</div></div></div>; }
function Modal({ open, onClose, title, children }) { if (!open) return null; return <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} /><div style={{ position: "relative", background: P.c, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "20px 20px 32px", animation: "slideUp .3s ease" }}><div style={{ width: 40, height: 4, background: P.bd, borderRadius: 2, margin: "0 auto 16px" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: F.h }}>{title}</h2><button onClick={onClose} style={{ background: "none", border: "none", color: P.l, cursor: "pointer", fontSize: 20 }}>✕</button></div>{children}</div></div>; }
function Fl({ l, children }) { return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.m, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: F.m }}>{l}</label>{children}</div>; }
function Btn({ children, onClick, color = P.r, full, disabled, small, sx }) { return <button onClick={disabled ? undefined : onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: small ? "8px 14px" : "12px 20px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: F.b, opacity: disabled ? 0.4 : 1, width: full ? "100%" : "auto", ...sx }}>{children}</button>; }
function Pill({ s }) { const x = ST[s]; return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: x.b, color: x.c, fontFamily: F.m }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: x.c }} />{x.l}</span>; }
function CondBadge({ c }) { const clr = COND_C[c] || P.am; return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${clr}15`, color: clr, fontFamily: F.m }}>{c}</span>; }
function Toast({ msg, show }) { return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, background: P.r, color: "#fff", padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, opacity: show ? 1 : 0, transition: "all .3s", pointerEvents: "none", zIndex: 9999, maxWidth: "90%", textAlign: "center", fontFamily: F.b }}>{msg}</div>; }

function Nav({ tab, set, isAdmin }) {
  const ts = [{ k: "yard", l: "Yard" }, { k: "tools", l: "Tools" }, { k: "activity", l: "Activity" }, { k: "projects", l: "Projects" }];
  if (isAdmin) ts.push({ k: "admin", l: "Admin" });
  return <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#fff", borderTop: `2px solid ${P.tn}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom,8px)" }}>
    {ts.map(t => <button key={t.k} onClick={() => set(t.k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: tab === t.k ? P.r : P.l, borderTop: tab === t.k ? `2px solid ${P.r}` : "2px solid transparent", marginTop: -2 }}><span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.m }}>{t.l}</span></button>)}
  </nav>;
}

export default function App() {
  const [user, setUser] = useState(null); const [mode, setMode] = useState("login");
  const [aName, setAN] = useState(""); const [aPin, setAP] = useState(""); const [aEmail, setAE] = useState(""); const [aErr, setAErr] = useState("");
  const [mats, setMats] = useState([]); const [projs, setProjs] = useState([]); const [txns, setTxns] = useState([]); const [tools, setTools] = useState([]); const [cos, setCos] = useState([]); const [cats, setCats] = useState([]); const [users, setUsers] = useState([]); const [urgRpts, setUrgRpts] = useState([]);
  const [tab, setTab] = useState("yard"); const [search, setSrch] = useState(""); const [fCat, setFC] = useState("All");
  const [toast, setToast] = useState({ m: "", s: false }); const [loaded, setLoaded] = useState(false);
  const [txnMod, setTxnMod] = useState({ o: false, m: "take", mat: null });
  const [matMod, setMatMod] = useState({ o: false, mat: null }); const [toolMod, setToolMod] = useState({ o: false, tool: null });
  const [toolCoMod, setToolCoMod] = useState({ o: false, tool: null }); const [retMod, setRetMod] = useState({ o: false, co: null });
  const [delMod, setDelMod] = useState({ o: false, type: null, id: null, name: "" });
  const [editReason, setEditReason] = useState("");
  const [projMod, setProjMod] = useState(false); const [nPN, setNPN] = useState(""); const [nPA, setNPA] = useState("");
  const [detail, setDetail] = useState(null); const [pFilter, setPF] = useState("active");
  const [adPg, setAdPg] = useState("hub"); const [adAuth, setAdAuth] = useState(false);
  const [aaName, setAAN] = useState(""); const [aaPin, setAAP] = useState(""); const [aaErr, setAAE] = useState("");
  const [editUser, setEU] = useState(null); const [euN, setEUN] = useState(""); const [euE, setEUE] = useState(""); const [euP, setEUP] = useState("");
  const [delUserMod, setDUM] = useState(null);
  const [nCat, setNC] = useState("");
  const [rptCat, setRptCat] = useState("All"); const [rptCond, setRptCond] = useState("All"); const [rptStock, setRptStock] = useState("All");
  const [emailMod, setEM] = useState(false); const [emailTo, setET] = useState("");
  const [retCond, setRetCond] = useState("Good"); const [retNote, setRetNote] = useState("");
  const [urgType, setUrgType] = useState("All"); const [urgStart, setUrgStart] = useState(""); const [urgEnd, setUrgEnd] = useState("");

  const show = useCallback(m => { setToast({ m, s: true }); setTimeout(() => setToast(t => ({ ...t, s: false })), 2800); }, []);
  const isA = user && RO[user.role] >= 2;
  const isS = user && RO[user.role] >= 3;

  const load = useCallback(async () => {
    try {
      const [a, b, c, d, e, f, g, h] = await Promise.all([api("materials?order=name"), api("projects?order=name"), api("transactions?order=created_at.desc&limit=200"), api("tools?order=name"), api("tool_checkouts?order=checked_out_at.desc&limit=200"), api("categories?order=sort_order"), api("yard_users?order=name"), api("urgent_reports?order=created_at.desc&limit=200")]);
      setMats(a); setProjs(b); setTxns(c); setTools(d); setCos(e); setCats(f); setUsers(g); setUrgRpts(h);
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { if (!user) return; const i = setInterval(load, 15000); return () => clearInterval(i); }, [user, load]);

  const login = async () => { setAErr(""); if (!aName.trim() || aPin.length !== 4) { setAErr("Enter name and 4-digit PIN."); return; } try { const all = await api("yard_users?active=eq.true"); const f = all.find(u => u.name.toLowerCase() === aName.trim().toLowerCase() && u.pin === aPin); if (!f) { setAErr("Name or PIN not found."); return; } setUser(f); show(`Welcome, ${f.name}!`); } catch (e) { setAErr("Connection error."); } };
  const signup = async () => { setAErr(""); if (!aName.trim() || !aEmail.trim() || aPin.length !== 4) { setAErr("Fill all fields."); return; } try { const ex = await api(`yard_users?email=eq.${encodeURIComponent(aEmail.toLowerCase().trim())}`); if (ex?.length) { setAErr("Email registered."); return; } const r = await api("yard_users", { method: "POST", body: JSON.stringify({ email: aEmail.toLowerCase().trim(), name: aName.trim(), pin: aPin, role: "user" }) }); if (r?.[0]) { setUser(r[0]); show(`Welcome!`); } } catch (e) { setAErr("Failed."); } };

  const saveMat = async (mat, reason) => {
    try {
      if (mat.id) {
        await api(`materials?id=eq.${mat.id}`, { method: "PATCH", body: JSON.stringify(mat) });
        if (reason) {
          await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "edit", title: `Material Edited: ${mat.name}`, message: `${user.name} edited ${mat.name}\nReason: ${reason}`, user_name: user.name, user_id: user.id }) });
        }
        show(`${mat.name} updated`);
      } else {
        await api("materials", { method: "POST", body: JSON.stringify(mat) });
        show(`${mat.name} added`);
      }
      await load(); setMatMod({ o: false, mat: null }); setEditReason("");
    } catch (e) { show("Error"); }
  };

  const doTxn = async (matId, qty, projId, note, md) => {
    const mat = mats.find(x => x.id === matId), proj = projs.find(x => x.id === projId);
    const nq = md === "take" ? mat.qty - qty : mat.qty + qty;
    try {
      await api("transactions", { method: "POST", body: JSON.stringify({ material_id: matId, material_name: mat.name, unit: mat.unit, qty, mode: md, project_id: projId || null, project_name: proj?.name || "", note, user_name: user.name, user_id: user.id }) });
      
      if (md === "take" && nq <= 0) {
        await api(`materials?id=eq.${matId}`, { method: "DELETE" });
        await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "depleted", title: `Material Depleted: ${mat.name}`, message: `${user.name} took the last ${qty} ${mat.unit} of ${mat.name}. Item removed from inventory.`, user_name: user.name, user_id: user.id }) });
      } else {
        await api(`materials?id=eq.${matId}`, { method: "PATCH", body: JSON.stringify({ qty: Math.max(0, nq) }) });
      }
      
      await load(); setTxnMod({ o: false, m: "take", mat: null }); setDetail(null);
      show(md === "take" ? (nq <= 0 ? `Took last ${qty} ${mat.unit}` : `Took ${qty} ${mat.unit}`) : `Added ${qty} ${mat.unit}`);
    } catch (e) { 
      console.error(e); 
      show("Error: " + e.message); 
    }
  };

  const delMat = async (id) => {
    const n = mats.find(m => m.id === id)?.name;
    try { 
      await api(`materials?id=eq.${id}`, { method: "DELETE" }); 
      await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "delete", title: `Material Deleted: ${n}`, message: `${user.name} deleted material: ${n}`, user_name: user.name, user_id: user.id }) });
      await load(); 
      setDelMod({ o: false, type: null, id: null, name: "" }); 
      setDetail(null); 
      show(`${n} removed`); 
    } catch (e) { show("Error"); }
  };

  const saveTool = async (tool, reason) => {
    try {
      if (tool.id) {
        await api(`tools?id=eq.${tool.id}`, { method: "PATCH", body: JSON.stringify(tool) });
        if (reason) {
          await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "edit", title: `Tool Edited: ${tool.name}`, message: `${user.name} edited ${tool.name}\nReason: ${reason}`, user_name: user.name, user_id: user.id }) });
        }
        show(`${tool.name} updated`);
      } else {
        await api("tools", { method: "POST", body: JSON.stringify(tool) });
        show(`${tool.name} added`);
      }
      await load(); setToolMod({ o: false, tool: null }); setEditReason("");
    } catch (e) { show("Error"); }
  };

  const checkOut = async (toolId, toolName, projId, note) => {
    const proj = projs.find(p => p.id === projId);
    try { await api("tool_checkouts", { method: "POST", body: JSON.stringify({ tool_id: toolId, tool_name: toolName, checked_out_by: user.name, user_id: user.id, project_id: projId, project_name: proj?.name || "", note }) }); await load(); setToolCoMod({ o: false, tool: null }); show(`${toolName} checked out`); } catch (e) { show("Error"); }
  };

  const returnTool = async (coId, toolId, toolName, cond, note) => {
    try {
      await api(`tool_checkouts?id=eq.${coId}`, { method: "PATCH", body: JSON.stringify({ returned_at: new Date().toISOString(), note: note ? `Returned: ${cond}. ${note}` : `Returned: ${cond}` }) });
      await api(`tools?id=eq.${toolId}`, { method: "PATCH", body: JSON.stringify({ condition: cond, notes: note || undefined }) });
      if (cond !== "Good") {
        await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "damage", title: `Tool Returned Damaged: ${toolName}`, message: `${user.name} returned ${toolName}\nCondition: ${cond}\nNote: ${note || "none"}`, user_name: user.name, user_id: user.id }) });
      }
      await load(); setRetMod({ o: false, co: null }); setRetCond("Good"); setRetNote(""); show(`${toolName} returned — ${cond}`);
    } catch (e) { show("Error"); }
  };

  const delTool = async (id) => {
    const n = tools.find(t => t.id === id)?.name;
    try { 
      await api(`tools?id=eq.${id}`, { method: "DELETE" }); 
      await api("urgent_reports", { method: "POST", body: JSON.stringify({ type: "delete", title: `Tool Deleted: ${n}`, message: `${user.name} deleted tool: ${n}`, user_name: user.name, user_id: user.id }) });
      await load(); 
      setDelMod({ o: false, type: null, id: null, name: "" }); 
      show(`${n} removed`); 
    } catch (e) { show("Error"); }
  };

  const saveProj = async () => { if (!nPN.trim()) return; try { await api("projects", { method: "POST", body: JSON.stringify({ name: nPN.trim(), address: nPA.trim() }) }); await load(); setProjMod(false); setNPN(""); setNPA(""); show("Added"); } catch (e) { show("Error"); } };
  const togProj = async (id, a) => { try { await api(`projects?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Archived" : "Restored"); } catch (e) { show("Error"); } };
  const addCat = async () => { if (!nCat.trim()) return; try { await api("categories", { method: "POST", body: JSON.stringify({ name: nCat.trim(), sort_order: cats.length + 1 }) }); await load(); setNC(""); show("Added"); } catch (e) { show("Error"); } };
  const delCat = async (id, n) => { try { await api(`categories?id=eq.${id}`, { method: "DELETE" }); await load(); show(`"${n}" removed`); } catch (e) { show("Error"); } };
  const togUser = async (id, a) => { try { await api(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ active: !a }) }); await load(); show(a ? "Deactivated" : "Activated"); } catch (e) { show("Error"); } };
  const chRole = async (id, r) => { try { await api(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ role: r }) }); await load(); show("Updated"); } catch (e) { show("Error"); } };
  const togRpts = async (id, r) => { try { await api(`yard_users?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ receives_reports: !r }) }); await load(); show("Updated"); } catch (e) { console.error(e); show("Error: " + e.message); } };
  const saveEU = async () => { if (!euN.trim() || !euE.trim() || euP.length !== 4) { show("Fill all fields"); return; } try { await api(`yard_users?id=eq.${editUser}`, { method: "PATCH", body: JSON.stringify({ name: euN.trim(), email: euE.toLowerCase().trim(), pin: euP }) }); await load(); setEU(null); show("Updated"); } catch (e) { show("Error"); } };
  const delUser = async (id) => { try { await api(`yard_users?id=eq.${id}`, { method: "DELETE" }); await load(); setDUM(null); show("Employee deleted"); } catch (e) { show("Error"); } };

  const lowS = mats.filter(m => gSt(m.qty, m.low_threshold) !== "good");
  const actCo = cos.filter(c => !c.returned_at);
  const filtered = mats.filter(m => { const q = search.toLowerCase(); return (!q || m.name.toLowerCase().includes(q) || m.location.toLowerCase().includes(q) || (m.notes || "").toLowerCase().includes(q)) && (fCat === "All" || m.category === fCat); });

  const rptMats = mats.filter(m => { if (rptCat !== "All" && m.category !== rptCat) return false; if (rptCond !== "All" && (m.condition || "Good") !== rptCond) return false; if (rptStock === "low") return gSt(m.qty, m.low_threshold) !== "good"; if (rptStock === "out") return m.qty <= 0; return true; });
  const mkCSV = () => { const r = [["Name", "Category", "Qty", "Unit", "Condition", "Location", "Notes", "Low Threshold"]]; rptMats.forEach(m => r.push([m.name, m.category, m.qty, m.unit, m.condition || "Good", m.location, m.notes, m.low_threshold])); return r.map(x => x.join(",")).join("\n"); };
  const dlCSV = () => { const b = new Blob([mkCSV()], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u); show("Downloaded"); };
  
  const emailRpt = () => { 
    if (!emailTo.trim()) return; 
    const html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;max-width:800px;margin:0 auto;background:#faf8f5;padding:20px}@media print{body{background:#fff;padding:0}}.header{background:#fff;border-top:4px solid #c4b59a;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e5e0d8;text-align:center}@media print{.header{border-top:2px solid #000;border-radius:0}}.header h1{margin:0;font-family:Georgia,serif;font-size:24px;color:#1a1a1a}.header .subtitle{font-size:11px;color:#c41e2a;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-top:4px}@media print{.header .subtitle{color:#000}}.stats{background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e0d8;border-left:4px solid #c41e2a;margin-bottom:16px}@media print{.stats{border:1px solid #000;border-radius:0}}.stats h2{margin:0 0 8px 0;font-size:12px;color:#6b6560;text-transform:uppercase;letter-spacing:1px}@media print{.stats h2{color:#000}}.stats .num{font-size:32px;font-weight:700;font-family:Georgia,serif}table{width:100%;background:#fff;border-radius:12px;border:1px solid #e5e0d8;border-collapse:separate;border-spacing:0;overflow:hidden}@media print{table{border:1px solid #000;border-radius:0;border-collapse:collapse}}th{background:#faf8f5;padding:12px;text-align:left;font-size:11px;color:#6b6560;text-transform:uppercase;letter-spacing:1px;font-weight:700;border-bottom:2px solid #e5e0d8}@media print{th{background:#fff;color:#000;border:1px solid #000}}td{padding:12px;border-bottom:1px solid #f0ece6}@media print{td{border:1px solid #000}}.cond-good{color:#16a34a;background:rgba(22,163,74,0.08);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}@media print{.cond-good{color:#000;background:#fff;border:1px solid #000}}.cond-fair{color:#d97706;background:rgba(217,119,6,0.08);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}@media print{.cond-fair{color:#000;background:#fff;border:1px solid #000}}.cond-poor{color:#c41e2a;background:rgba(196,30,42,0.06);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}@media print{.cond-poor{color:#000;background:#fff;border:1px solid #000}}.footer{text-align:center;margin-top:24px;font-size:12px;color:#9c9590}@media print{.footer{color:#000}}</style></head><body><div class="header"><h1>Masterpiece</h1><div class="subtitle">Inventory Report</div></div><div class="stats"><h2>Total Items</h2><div class="num">${rptMats.length}</div></div><table><thead><tr><th>Name</th><th>Category</th><th>Qty</th><th>Condition</th><th>Location</th></tr></thead><tbody>${rptMats.map(m => `<tr><td style="font-weight:600">${m.name}</td><td style="font-size:13px;color:#6b6560">${m.category}</td><td style="font-weight:700;font-family:Georgia,serif">${m.qty} ${m.unit}</td><td><span class="cond-${(m.condition || 'Good').toLowerCase()}">${m.condition || 'Good'}</span></td><td style="font-size:13px;color:#6b6560">${m.location}</td></tr>`).join('')}</tbody></table><div class="footer">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div></body></html>`;
    window.open(`mailto:${emailTo.trim()}?subject=${encodeURIComponent("Masterpiece Inventory Report")}&body=${encodeURIComponent(html)}`, "_blank");
    setEM(false); 
    show("Opening email"); 
  };

  const emailUrg = () => { 
    if (!emailTo.trim()) return;
    const filtered = urgRpts.filter(r => {
      if (urgType !== "All" && r.type !== urgType) return false;
      if (urgStart && new Date(r.created_at) < new Date(urgStart)) return false;
      if (urgEnd && new Date(r.created_at) > new Date(urgEnd)) return false;
      return true;
    });
    const html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;max-width:800px;margin:0 auto;background:#faf8f5;padding:20px}@media print{body{background:#fff;padding:0}}.header{background:#fff;border-top:4px solid #c41e2a;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e5e0d8;display:flex;align-items:center;gap:12px}@media print{.header{border-top:2px solid #000}}.icon{width:48px;height:48px;background:rgba(196,30,42,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px}@media print{.icon{background:#fff;border:2px solid #000}}.header h1{margin:0;font-size:18px;color:#c41e2a;font-weight:700}@media print{.header h1{color:#000}}.header .subtitle{font-size:11px;color:#6b6560;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-top:4px}@media print{.header .subtitle{color:#000}}.stats{background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e0d8;border-left:4px solid #c41e2a;margin-bottom:16px}@media print{.stats{border:1px solid #000;border-radius:0}}.stats h2{margin:0 0 8px 0;font-size:12px;color:#6b6560;text-transform:uppercase;letter-spacing:1px}@media print{.stats h2{color:#000}}.stats .num{font-size:32px;font-weight:700;font-family:Georgia,serif}table{width:100%;background:#fff;border-radius:12px;border:1px solid #e5e0d8;border-collapse:separate;border-spacing:0;overflow:hidden}@media print{table{border:1px solid #000;border-radius:0;border-collapse:collapse}}th{background:#faf8f5;padding:12px;text-align:left;font-size:11px;color:#6b6560;text-transform:uppercase;letter-spacing:1px;font-weight:700;border-bottom:2px solid #e5e0d8}@media print{th{background:#fff;color:#000;border:1px solid #000}}td{padding:12px;border-bottom:1px solid #f0ece6}@media print{td{border:1px solid #000}}.footer{text-align:center;margin-top:24px;font-size:12px;color:#9c9590}@media print{.footer{color:#000}}</style></head><body><div class="header"><div class="icon">⚠️</div><div><h1>Urgent Reports</h1><div class="subtitle">Masterpiece Material Yard</div></div></div><div class="stats"><h2>Total Events</h2><div class="num">${filtered.length}</div></div><table><thead><tr><th>Date</th><th>Type</th><th>Event</th><th>User</th></tr></thead><tbody>${filtered.map(r => `<tr><td style="font-size:13px">${new Date(r.created_at).toLocaleDateString()}</td><td style="font-size:13px;text-transform:capitalize">${r.type}</td><td style="font-weight:600">${r.title}<br><span style="font-size:13px;color:#6b6560;font-weight:400">${r.message.replace(/\n/g, '<br>')}</span></td><td style="font-size:13px">${r.user_name}</td></tr>`).join('')}</tbody></table><div class="footer">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div></body></html>`;
    const rptEmails = users.filter(u => u.receives_reports).map(u => u.email).join(",");
    window.open(`mailto:${rptEmails || emailTo.trim()}?subject=${encodeURIComponent("Masterpiece Urgent Reports")}&body=${encodeURIComponent(html)}`, "_blank");
    setEM(false); 
    show("Opening email"); 
  };

  const css = `@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}input:focus,select:focus{border-color:${P.r}!important}`;

  if (!user) return <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: F.b }}><style>{css}</style>
    <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", height: 4, borderRadius: 4, overflow: "hidden", marginBottom: 28 }}><div style={{ flex: 1, background: P.tn }} /><div style={{ flex: 1, background: P.r }} /><div style={{ flex: 1, background: P.bk }} /></div>
      <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ display: "inline-flex" }}><Logo /></div></div>
      <div style={{ display: "flex", background: P.bdL, borderRadius: 10, padding: 3, marginBottom: 24 }}>
        {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setAErr(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: mode === m ? "#fff" : "transparent", color: mode === m ? P.tx : P.l, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F.b }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
      </div>
      {mode === "signup" && <><Fl l="Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" /></Fl><Fl l="Email"><input style={iS} type="email" value={aEmail} onChange={e => setAE(e.target.value)} placeholder="you@email.com" /></Fl><Fl l="Create 4-digit PIN"><input style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" /></Fl>{aErr && <div style={{ color: P.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={signup}>Create Account</Btn></>}
      {mode === "login" && <><Fl l="Name"><input style={iS} value={aName} onChange={e => setAN(e.target.value)} placeholder="e.g. Stephen" onKeyDown={e => { if (e.key === "Enter") document.getElementById("pin")?.focus(); }} /></Fl><Fl l="PIN"><input id="pin" style={{ ...iS, textAlign: "center", fontSize: 24, letterSpacing: 12, fontFamily: F.m }} maxLength={4} value={aPin} onChange={e => setAP(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="----" onKeyDown={e => { if (e.key === "Enter" && aPin.length === 4) login(); }} /></Fl>{aErr && <div style={{ color: P.r, fontSize: 13, marginBottom: 12, fontFamily: F.m }}>{aErr}</div>}<Btn full onClick={login}>Enter the Yard</Btn></>}
    </div>
  </div>;

  if (!loaded) return <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.m, color: P.l }}><style>{css}</style>Loading...</div>;

  if (detail) {
    const mat = mats.find(m => m.id === detail); if (!mat) { setDetail(null); return null; }
    const st = gSt(mat.qty, mat.low_threshold); const mA = txns.filter(a => a.material_id === mat.id).slice(0, 20);
    return <div style={{ minHeight: "100vh", background: P.bg, fontFamily: F.b, paddingBottom: 80 }}><style>{css}</style>
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: P.r }}>←</button>
        <div style={{ flex: 1 }}><h2 style={{ fontFamily: F.h, fontSize: 18, fontWeight: 700, margin: 0 }}>{mat.name}</h2><span style={{ fontSize: 12, color: P.l, fontFamily: F.m }}>{mat.category} · {mat.location}</span></div>
        <button onClick={() => setMatMod({ o: true, mat })} style={{ background: P.tB, border: "none", cursor: "pointer", color: P.bk, padding: 8, borderRadius: 8, fontSize: 12 }}>Edit</button>
        <button onClick={() => setDelMod({ o: true, type: "mat", id: mat.id, name: mat.name })} style={{ background: P.rB, border: "none", cursor: "pointer", color: P.r, padding: 8, borderRadius: 8, fontSize: 12 }}>Delete</button>
      </div>
      <div style={{ margin: "0 16px 16px", background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${P.bd}`, borderTop: `3px solid ${P.tn}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div><div style={{ fontSize: 40, fontWeight: 700, fontFamily: F.h, lineHeight: 1.1 }}>{mat.qty}<span style={{ fontSize: 16, color: P.m, fontWeight: 400 }}> {mat.unit}</span></div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}><Pill s={st} /><CondBadge c={mat.condition || "Good"} /></div>
        </div>
        {mat.notes && <div style={{ fontSize: 13, color: P.m, padding: "8px 12px", background: P.bg, borderRadius: 8 }}>{mat.notes}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, margin: "0 16px 20px" }}>
        <Btn full color={P.r} onClick={() => setTxnMod({ o: true, m: "take", mat })} sx={{ flex: 1 }}>↓ Take</Btn>
        <Btn full color={P.g} onClick={() => setTxnMod({ o: true, m: "add", mat })} sx={{ flex: 1 }}>↑ Add</Btn>
      </div>
      <div style={{ margin: "0 16px" }}><h3 style={{ fontFamily: F.h, fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Activity</h3>
        {mA.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: P.l, fontFamily: F.m }}>No activity</div> : mA.map(a => <div key={a.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.bdL}`, fontSize: 14 }}><strong>{a.user_name}</strong> {a.mode === "take" ? "took" : "added"} <strong style={{ color: a.mode === "take" ? P.r : P.g }}>{a.qty} {a.unit}</strong>{a.project_name && <span style={{ color: P.m }}> → {a.project_name}</span>}<div style={{ fontSize: 11, color: P.l, fontFamily: F.m }}>{fD(a.created_at)}</div></div>)}
      </div>
      {txnMod.o && txnMod.mat?.id === mat.id && <TxnSheet mat={mat} mode={txnMod.m} projs={projs} onClose={() => setTxnMod({ o: false, m: "take", mat: null })} onSubmit={doTxn} />}
      <Modal open={delMod.o && delMod.type === "mat"} onClose={() => setDelMod({ o: false, type: null, id: null, name: "" })} title="Delete Material?"><p style={{ color: P.m, marginBottom: 20 }}>Remove <strong>{delMod.name}</strong>?</p><div style={{ display: "flex", gap: 10 }}><button onClick={() => setDelMod({ o: false, type: null, id: null, name: "" })} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button><Btn full color={P.r} onClick={() => delMat(delMod.id)} sx={{ flex: 1 }}>Delete</Btn></div></Modal>
      <Nav tab={tab} set={t => { setDetail(null); setTab(t); }} isAdmin={isA} />
    </div>;
  }

  return <div style={{ minHeight: "100vh", background: P.bg, fontFamily: F.b, paddingBottom: 80 }}><style>{css}</style>
    <div style={{ padding: "14px 16px", background: "#fff", borderBottom: `1px solid ${P.bd}`, borderTop: `3px solid ${P.tn}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Logo />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: P.l, fontFamily: F.m }}>{user.name}</span>
        {isA && <span style={{ background: P.rB, color: P.r, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: F.m }}>{RL[user.role]}</span>}
        <button onClick={() => { setUser(null); setAN(""); setAP(""); setAdAuth(false); setAdPg("hub"); }} style={{ background: P.tB, border: "none", cursor: "pointer", color: P.m, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontFamily: F.m, fontWeight: 600 }}>Log Out</button>
      </div>
    </div>
    <div style={{ padding: "16px 16px 0" }}>

      {tab === "yard" && <div style={{ animation: "fadeIn .3s" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[{ l: "Items", v: mats.length, b: P.tn }, { l: "Low", v: lowS.filter(m => gSt(m.qty, m.low_threshold) === "low").length, b: P.am }, { l: "Out", v: lowS.filter(m => gSt(m.qty, m.low_threshold) === "out").length, b: P.r }].map(s =>
            <div key={s.l} style={{ background: "#fff", borderRadius: 10, padding: "10px", border: `1px solid ${P.bd}`, borderLeft: `3px solid ${s.b}` }}><div style={{ fontSize: 9, fontFamily: F.m, color: P.l, textTransform: "uppercase" }}>{s.l}</div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.h }}>{s.v}</div></div>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ position: "relative", flex: 1 }}><input style={{ ...iS, paddingLeft: 14, fontSize: 14 }} placeholder="Search..." value={search} onChange={e => setSrch(e.target.value)} /></div>
          <Btn onClick={() => setMatMod({ o: true, mat: null })} sx={{ padding: "12px 14px" }}>+</Btn>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
          {["All", ...cats.map(c => c.name).sort()].map(c => <button key={c} onClick={() => setFC(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${fCat === c ? P.tn : P.bd}`, background: fCat === c ? P.tB : "#fff", color: fCat === c ? P.bk : P.m, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{c}</button>)}
        </div>
        {filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: P.l, fontFamily: F.m }}>No materials</div> : filtered.map(mat => {
          const st = gSt(mat.qty, mat.low_threshold);
          return <div key={mat.id} onClick={() => setDetail(mat.id)} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: `1px solid ${st === "out" ? "rgba(196,30,42,.3)" : st === "low" ? "rgba(217,119,6,.3)" : P.bd}`, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{mat.name}</div><div style={{ fontSize: 11, color: P.l, fontFamily: F.m, marginTop: 2 }}>{mat.category} · {mat.location} <CondBadge c={mat.condition || "Good"} /></div></div>
              <Pill s={st} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.h }}>{mat.qty}<span style={{ fontSize: 13, color: P.m, fontWeight: 400 }}> {mat.unit}</span></div>
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setTxnMod({ o: true, m: "take", mat })} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: P.rB, color: P.r, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Take</button>
                <button onClick={() => setTxnMod({ o: true, m: "add", mat })} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: P.gB, color: P.g, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
            </div>
          </div>;
        })}
      </div>}

      {tab === "tools" && <div style={{ animation: "fadeIn .3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Tools</h2><Btn small onClick={() => setToolMod({ o: true, tool: null })}>+ Add</Btn></div>
        {tools.map(tool => { const co = cos.find(c => c.tool_id === tool.id && !c.returned_at); const isOut = !!co;
          return <div key={tool.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: `1px solid ${isOut ? "rgba(217,119,6,.3)" : P.bd}`, borderLeft: `3px solid ${isOut ? P.am : P.tn}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>{tool.name}</div>{tool.serial_number && <div style={{ fontSize: 11, fontFamily: F.m, color: P.l }}>S/N: {tool.serial_number}</div>}<CondBadge c={tool.condition || "Good"} /></div>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F.m, padding: "3px 10px", borderRadius: 20, background: isOut ? P.aB : P.gB, color: isOut ? P.am : P.g }}>{isOut ? "Out" : "Available"}</span>
            </div>
            {isOut && <div style={{ background: P.aB, borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 13 }}><strong>{co.checked_out_by}</strong> · {co.project_name} · {fAgo(co.checked_out_at)}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              {isOut ? <Btn small full color={P.g} onClick={() => setRetMod({ o: true, co })} sx={{ flex: 1 }}>Return</Btn> : <Btn small full onClick={() => setToolCoMod({ o: true, tool })} sx={{ flex: 1 }}>Check Out</Btn>}
              <button onClick={() => setToolMod({ o: true, tool })} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.bd}`, background: "#fff", color: P.m, fontSize: 12, cursor: "pointer" }}>Edit</button>
              <button onClick={() => setDelMod({ o: true, type: "tool", id: tool.id, name: tool.name })} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: P.rB, color: P.r, fontSize: 12, cursor: "pointer" }}>Del</button>
            </div>
          </div>; })}
      </div>}

      {tab === "activity" && <div style={{ animation: "fadeIn .3s" }}>
        <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Activity</h2>
        {[...txns.map(t => ({ ...t, tp: "m", ts: t.created_at })), ...cos.map(c => ({ ...c, tp: "t", ts: c.checked_out_at }))].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 50).map(a =>
          <div key={a.id} style={{ padding: "12px 14px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8 }}>
            {a.tp === "m" ? <div style={{ fontSize: 14 }}><strong>{a.user_name}</strong> {a.mode === "take" ? "took" : "added"} <strong style={{ color: a.mode === "take" ? P.r : P.g }}>{a.qty} {a.unit}</strong> of <strong>{a.material_name}</strong>{a.project_name && <span style={{ color: P.m }}> → {a.project_name}</span>}</div>
              : <div style={{ fontSize: 14 }}><strong>{a.checked_out_by}</strong> {a.returned_at ? "returned" : "checked out"} <strong style={{ color: P.r }}>{a.tool_name}</strong>{a.project_name && <span style={{ color: P.m }}> → {a.project_name}</span>}{a.returned_at && a.note && <span style={{ color: P.am }}> ({a.note})</span>}</div>}
            <div style={{ fontSize: 11, color: P.l, fontFamily: F.m, marginTop: 4 }}>{fD(a.ts)}</div>
          </div>)}
      </div>}

      {tab === "projects" && <div style={{ animation: "fadeIn .3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: 0 }}>Projects</h2>{isA && <Btn small onClick={() => setProjMod(true)}>+ Add</Btn>}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{["active", "archived", "all"].map(f => <button key={f} onClick={() => setPF(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${pFilter === f ? P.tn : P.bd}`, background: pFilter === f ? P.tB : "#fff", color: pFilter === f ? P.bk : P.m, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>)}</div>
        {projs.filter(p => pFilter === "active" ? p.active !== false : pFilter === "archived" ? p.active === false : true).map(p =>
          <div key={p.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, borderLeft: `3px solid ${p.active !== false ? P.tn : P.l}`, opacity: p.active !== false ? 1 : .6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, color: P.l }}>{p.address}</div></div>
              {isA && <button onClick={() => togProj(p.id, p.active !== false)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: p.active !== false ? P.aB : P.gB, color: p.active !== false ? P.am : P.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{p.active !== false ? "Archive" : "Restore"}</button>}
            </div>
          </div>)}
      </div>}

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
          {[{ k: "reports", l: "Inventory Report", d: "View & export inventory", c: P.r }, { k: "urgent", l: "Urgent Reports", d: "Critical events log", c: P.r }, { k: "employees", l: "Employees", d: "Manage team", c: P.bk }, { k: "categories", l: "Categories", d: "Add & remove categories", c: P.tn }].map(p =>
            <button key={p.k} onClick={() => setAdPg(p.k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "16px 20px", background: "#fff", borderRadius: 14, border: `1px solid ${P.bd}`, borderLeft: `4px solid ${p.c}`, marginBottom: 10, cursor: "pointer", fontFamily: F.b }}><div style={{ fontWeight: 700, fontSize: 16 }}>{p.l}</div><div style={{ fontSize: 13, color: P.l, marginTop: 4 }}>{p.d}</div></button>)}
        </div>}

        {adAuth && adPg === "reports" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Inventory Report</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={rptCat} onChange={e => setRptCat(e.target.value)} style={{ ...iS, flex: 1 }}><option value="All">All Categories</option>{cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
            <select value={rptCond} onChange={e => setRptCond(e.target.value)} style={{ ...iS, flex: 1 }}><option value="All">All Conditions</option>{CONDS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={rptStock} onChange={e => setRptStock(e.target.value)} style={{ ...iS, flex: 1 }}><option value="All">All Stock</option><option value="low">Low & Out Only</option><option value="out">Out Only</option></select>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${P.bd}`, borderLeft: `3px solid ${P.r}`, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontFamily: F.m, color: P.l, textTransform: "uppercase" }}>Showing</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: F.h }}>{rptMats.length}<span style={{ fontSize: 14, color: P.m, fontWeight: 400 }}> items</span></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><Btn small color={P.bk} onClick={dlCSV}>Download CSV</Btn><Btn small onClick={() => { setET(""); setEM(true); }}>Email Report</Btn></div>
          {rptMats.map(m => <div key={m.id} style={{ padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${P.bd}`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div><div style={{ fontSize: 11, color: P.l, fontFamily: F.m }}>{m.category} · {m.location}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontFamily: F.h }}>{m.qty} {m.unit}</div><CondBadge c={m.condition || "Good"} /></div>
          </div>)}
        </div>}

        {adAuth && adPg === "urgent" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Urgent Reports</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={urgType} onChange={e => setUrgType(e.target.value)} style={{ ...iS, flex: 1 }}><option value="All">All Types</option><option value="depleted">Depleted</option><option value="damage">Damage</option><option value="delete">Delete</option><option value="edit">Edit</option></select>
            <input type="date" value={urgStart} onChange={e => setUrgStart(e.target.value)} style={{ ...iS, flex: 1 }} placeholder="Start date" />
            <input type="date" value={urgEnd} onChange={e => setUrgEnd(e.target.value)} style={{ ...iS, flex: 1 }} placeholder="End date" />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${P.bd}`, borderLeft: `3px solid ${P.r}`, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontFamily: F.m, color: P.l, textTransform: "uppercase" }}>Showing</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: F.h }}>{urgRpts.filter(r => { if (urgType !== "All" && r.type !== urgType) return false; if (urgStart && new Date(r.created_at) < new Date(urgStart)) return false; if (urgEnd && new Date(r.created_at) > new Date(urgEnd)) return false; return true; }).length}<span style={{ fontSize: 14, color: P.m, fontWeight: 400 }}> events</span></div>
          </div>
          <Btn small onClick={() => { setET(""); setEM(true); }}>Email Report</Btn>
          {urgRpts.filter(r => { if (urgType !== "All" && r.type !== urgType) return false; if (urgStart && new Date(r.created_at) < new Date(urgStart)) return false; if (urgEnd && new Date(r.created_at) > new Date(urgEnd)) return false; return true; }).map(r => <div key={r.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, borderLeft: `3px solid ${P.r}`, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: P.r, textTransform: "uppercase", fontFamily: F.m }}>{r.type}</span><span style={{ fontSize: 11, color: P.l, fontFamily: F.m }}>{fD(r.created_at)}</span></div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: P.m, whiteSpace: "pre-wrap" }}>{r.message}</div>
            <div style={{ fontSize: 12, color: P.l, marginTop: 4, fontFamily: F.m }}>by {r.user_name}</div>
          </div>)}
        </div>}

        {adAuth && adPg === "employees" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Employees</h2>
          {users.map(u => { const canE = RO[user.role] > RO[u.role] || user.role === "super_admin"; const self = u.id === user.id;
            return <div key={u.id} style={{ padding: "12px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${P.bd}`, marginBottom: 8, borderLeft: `3px solid ${u.active ? P.g : P.l}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><div style={{ fontWeight: 600, fontSize: 15, color: u.active ? P.tx : P.l }}>{u.name} {self && <span style={{ fontSize: 11, color: P.l }}>(you)</span>}</div><div style={{ fontSize: 11, fontFamily: F.m, color: P.l }}>{u.email} · <span style={{ color: P.r }}>{RL[u.role]}</span></div>{u.receives_reports && <div style={{ fontSize: 10, fontFamily: F.m, color: P.g, marginTop: 2 }}>✓ Receives reports</div>}</div>
                {canE && <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  {!self && <button onClick={() => { setEU(u.id); setEUN(u.name); setEUE(u.email); setEUP(u.pin); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${P.bd}`, background: "#fff", color: P.m, cursor: "pointer", fontFamily: F.m }}>Edit</button>}
                  {!self && <select value={u.role} onChange={e => chRole(u.id, e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.bd}`, fontFamily: F.m }}><option value="user">Employee</option><option value="admin">Admin</option>{isS && <option value="senior_admin">Sr Admin</option>}</select>}
                  <button onClick={() => togRpts(u.id, u.receives_reports)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: u.receives_reports ? P.gB : P.bdL, color: u.receives_reports ? P.g : P.m, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{u.receives_reports ? "Gets Reports" : "No Reports"}</button>
                  {!self && <>
                    <button onClick={() => togUser(u.id, u.active)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: u.active ? P.rB : P.gB, color: u.active ? P.r : P.g, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>{u.active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => setDUM(u.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: P.r, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>Delete</button>
                  </>}
                </div>}
              </div>
            </div>; })}
        </div>}

        {adAuth && adPg === "categories" && <div>
          <button onClick={() => setAdPg("hub")} style={{ background: "none", border: "none", cursor: "pointer", color: P.r, fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: F.b }}>← Admin</button>
          <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Categories</h2>
          {cats.map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${P.bd}`, marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span><button onClick={() => delCat(c.id, c.name)} style={{ background: P.rB, border: "none", color: P.r, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F.m }}>Remove</button></div>)}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input style={{ ...iS, flex: 1, fontSize: 14 }} value={nCat} onChange={e => setNC(e.target.value)} placeholder="New category" onKeyDown={e => { if (e.key === "Enter") addCat(); }} /><Btn small onClick={addCat}>+</Btn></div>
        </div>}
      </div>}
    </div>

    {txnMod.o && !detail && <TxnSheet mat={txnMod.mat} mode={txnMod.m} projs={projs} onClose={() => setTxnMod({ o: false, m: "take", mat: null })} onSubmit={doTxn} />}

    <Modal open={matMod.o} onClose={() => { setMatMod({ o: false, mat: null }); setEditReason(""); }} title={matMod.mat ? "Edit Material" : "Add Material"}>
      <MatForm mat={matMod.mat} cats={cats} onSave={(m) => saveMat(m, matMod.mat ? editReason : null)} onCancel={() => { setMatMod({ o: false, mat: null }); setEditReason(""); }} isEdit={!!matMod.mat} editReason={editReason} setEditReason={setEditReason} />
    </Modal>

    <Modal open={toolMod.o} onClose={() => { setToolMod({ o: false, tool: null }); setEditReason(""); }} title={toolMod.tool ? "Edit Tool" : "Add Tool"}>
      <ToolForm tool={toolMod.tool} onSave={(t) => saveTool(t, toolMod.tool ? editReason : null)} onCancel={() => { setToolMod({ o: false, tool: null }); setEditReason(""); }} isEdit={!!toolMod.tool} editReason={editReason} setEditReason={setEditReason} />
    </Modal>

    {toolCoMod.o && toolCoMod.tool && <ToolCoSheet tool={toolCoMod.tool} projs={projs} userName={user.name} onClose={() => setToolCoMod({ o: false, tool: null })} onSubmit={checkOut} />}

    <Modal open={retMod.o} onClose={() => { setRetMod({ o: false, co: null }); setRetCond("Good"); setRetNote(""); }} title={`Return: ${retMod.co?.tool_name}`}>
      <Fl l="Condition">
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {CONDS.map(c => <button key={c} onClick={() => setRetCond(c)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${retCond === c ? (COND_C[c] || P.am) : P.bd}`, background: retCond === c ? `${COND_C[c]}15` : "#fff", color: retCond === c ? COND_C[c] : P.m, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}
        </div>
      </Fl>
      <Fl l="Note (required if Fair/Poor)"><input style={iS} value={retNote} onChange={e => setRetNote(e.target.value)} placeholder="What's the issue?" /></Fl>
      <Btn full disabled={retCond !== "Good" && !retNote.trim()} color={P.g} onClick={() => returnTool(retMod.co.id, retMod.co.tool_id, retMod.co.tool_name, retCond, retNote)}>Return Tool</Btn>
    </Modal>

    <Modal open={delMod.o && delMod.type === "tool"} onClose={() => setDelMod({ o: false, type: null, id: null, name: "" })} title="Delete Tool?">
      <p style={{ color: P.m, marginBottom: 20 }}>Remove <strong>{delMod.name}</strong>?</p>
      <div style={{ display: "flex", gap: 10 }}><button onClick={() => setDelMod({ o: false, type: null, id: null, name: "" })} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button><Btn full color={P.r} onClick={() => delTool(delMod.id)} sx={{ flex: 1 }}>Delete</Btn></div>
    </Modal>

    <Modal open={projMod} onClose={() => setProjMod(false)} title="Add Project">
      <Fl l="Name"><input style={iS} value={nPN} onChange={e => setNPN(e.target.value)} placeholder="e.g. Henderson Patio" /></Fl>
      <Fl l="Address"><input style={iS} value={nPA} onChange={e => setNPA(e.target.value)} placeholder="123 Main St, Denver, CO" /></Fl>
      <Btn full disabled={!nPN.trim()} onClick={saveProj}>Add Project</Btn>
    </Modal>

    <Modal open={!!editUser} onClose={() => setEU(null)} title="Edit Employee">
      <Fl l="Name"><input style={iS} value={euN} onChange={e => setEUN(e.target.value)} /></Fl>
      <Fl l="Email"><input style={iS} type="email" value={euE} onChange={e => setEUE(e.target.value)} /></Fl>
      <Fl l="PIN"><input style={{ ...iS, textAlign: "center", fontSize: 20, letterSpacing: 10, fontFamily: F.m }} maxLength={4} value={euP} onChange={e => setEUP(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Fl>
      <Btn full disabled={!euN.trim() || !euE.trim() || euP.length !== 4} onClick={saveEU}>Save</Btn>
    </Modal>

    <Modal open={emailMod} onClose={() => setEM(false)} title="Email Report">
      <Fl l="Send to"><input style={iS} type="email" value={emailTo} onChange={e => setET(e.target.value)} placeholder="payroll@masterpiecelv.com" /></Fl>
      <Btn full disabled={!emailTo.trim()} onClick={adPg === "urgent" ? emailUrg : emailRpt}>Send</Btn>
    </Modal>

    <Modal open={!!delUserMod} onClose={() => setDUM(null)} title="Delete Employee?">
      <p style={{ color: P.m, marginBottom: 20 }}>This will permanently remove <strong>{users.find(u => u.id === delUserMod)?.name}</strong>. This cannot be undone.</p>
      <div style={{ display: "flex", gap: 10 }}><button onClick={() => setDUM(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button><Btn full color={P.r} onClick={() => delUser(delUserMod)} sx={{ flex: 1 }}>Delete</Btn></div>
    </Modal>

    <Nav tab={tab} set={t => { setTab(t); if (t !== "admin") { setAdPg("hub"); setAdAuth(false); setAAN(""); setAAP(""); } }} isAdmin={isA} />
    <Toast msg={toast.m} show={toast.s} />
  </div>;
}

function TxnSheet({ mat, mode, projs, onClose, onSubmit }) {
  const [q, setQ] = useState(""); const [pId, setPId] = useState(""); const [nt, setNt] = useState("");
  if (!mat) return null;
  const isTake = mode === "take"; const qn = parseInt(q) || 0; const ok = qn > 0 && (isTake ? qn <= mat.qty && pId : true);
  return <Modal open={true} onClose={onClose} title={isTake ? `Take ${mat.name}` : `Add ${mat.name}`}>
    <div style={{ background: isTake ? P.rB : P.gB, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}><div style={{ fontSize: 13, color: P.m, fontFamily: F.m }}>Stock</div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: F.h }}>{mat.qty} {mat.unit}</div></div>
    <Fl l={`Qty (${mat.unit})`}><div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => setQ(Math.max(0, qn - 1).toString())} style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", cursor: "pointer", fontSize: 18 }}>−</button>
      <input type="number" min="0" value={q} onChange={e => setQ(e.target.value)} placeholder="0" style={{ ...iS, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: F.h, flex: 1 }} />
      <button onClick={() => setQ((qn + 1).toString())} style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", cursor: "pointer", fontSize: 18 }}>+</button>
    </div></Fl>
    {isTake && <Fl l="Project"><select value={pId} onChange={e => setPId(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select...</option>{projs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>}
    <Fl l="Note"><input style={iS} value={nt} onChange={e => setNt(e.target.value)} /></Fl>
    <Btn full disabled={!ok} color={isTake ? P.r : P.g} onClick={() => onSubmit(mat.id, qn, pId, nt, mode)}>{isTake ? `Take ${qn}` : `Add ${qn}`} {mat.unit}</Btn>
  </Modal>;
}

function MatForm({ mat, cats, onSave, onCancel, isEdit, editReason, setEditReason }) {
  const [f, setF] = useState(mat || { name: "", category: "Hardscape", qty: 0, unit: "pcs", low_threshold: 5, location: "", notes: "", condition: "Good" });
  const [hwSearch, setHwSearch] = useState(""); const [hwResults, setHwResults] = useState([]);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  
  return <div>
    <Fl l="Name">
      <input style={iS} value={f.category === "Hardware" ? hwSearch : f.name} onChange={async e => { 
        if (f.category === "Hardware") {
          setHwSearch(e.target.value); 
          s("name", e.target.value);
          if (e.target.value.length >= 2) { 
            const r = await searchHangers(e.target.value); 
            setHwResults(r); 
          } else setHwResults([]);
        } else {
          s("name", e.target.value);
        }
      }} placeholder={f.category === "Hardware" ? "Search hangers..." : "e.g. Belgard Dublin Cobble"} />
      {f.category === "Hardware" && hwResults.length > 0 && <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${P.bd}`, borderRadius: 8, marginTop: 8 }}>
        {hwResults.map(h => <button key={h.id} onClick={() => { 
          s("name", `${h.manufacturer} ${h.model}`);
          s("part_number", h.model);
          s("notes", h.manufacturer);
          setHwSearch(`${h.manufacturer} ${h.model}`);
          setHwResults([]);
        }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderBottom: `1px solid ${P.bdL}`, cursor: "pointer", fontFamily: F.b }}><div style={{ fontWeight: 600, fontSize: 14 }}>{h.model}</div><div style={{ fontSize: 12, color: P.l }}>{h.manufacturer}</div></button>)}
      </div>}
    </Fl>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Fl l="Category"><select style={{ ...iS, appearance: "none" }} value={f.category} onChange={e => s("category", e.target.value)}>{cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></Fl>
      <Fl l="Unit"><select style={{ ...iS, appearance: "none" }} value={f.unit} onChange={e => s("unit", e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></Fl>
      <Fl l="Qty"><input style={iS} type="number" min="0" value={f.qty} onChange={e => s("qty", parseInt(e.target.value) || 0)} /></Fl>
      <Fl l="Low Alert"><input style={iS} type="number" min="0" value={f.low_threshold} onChange={e => s("low_threshold", parseInt(e.target.value) || 0)} /></Fl>
    </div>
    <Fl l="Condition"><div style={{ display: "flex", gap: 6 }}>
      {CONDS.map(c => <button key={c} onClick={() => s("condition", c)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${f.condition === c ? (COND_C[c] || P.am) : P.bd}`, background: f.condition === c ? `${COND_C[c]}15` : "#fff", color: f.condition === c ? COND_C[c] : P.m, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}
    </div></Fl>
    <Fl l="Location"><input style={iS} value={f.location} onChange={e => s("location", e.target.value)} placeholder="Bay A-1" /></Fl>
    <Fl l="Notes"><input style={iS} value={f.notes} onChange={e => s("notes", e.target.value)} /></Fl>
    {isEdit && <Fl l="Reason for edit (required)"><input style={iS} value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Why is this being changed?" /></Fl>}
    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <Btn full disabled={!f.name.trim() || (isEdit && !editReason.trim())} onClick={() => onSave({ ...f, id: f.id })} sx={{ flex: 1 }}>Save</Btn>
    </div>
  </div>;
}

function ToolForm({ tool, onSave, onCancel, isEdit, editReason, setEditReason }) {
  const [f, setF] = useState(tool || { name: "", serial_number: "", condition: "Good", notes: "" });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  return <div>
    <Fl l="Tool Name"><input style={iS} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. DeWalt Impact Driver" /></Fl>
    <Fl l="Serial # (optional)"><input style={iS} value={f.serial_number} onChange={e => s("serial_number", e.target.value)} /></Fl>
    <Fl l="Condition"><div style={{ display: "flex", gap: 6 }}>
      {CONDS.map(c => <button key={c} onClick={() => s("condition", c)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${f.condition === c ? (COND_C[c] || P.am) : P.bd}`, background: f.condition === c ? `${COND_C[c]}15` : "#fff", color: f.condition === c ? COND_C[c] : P.m, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}
    </div></Fl>
    <Fl l="Notes"><input style={iS} value={f.notes} onChange={e => s("notes", e.target.value)} /></Fl>
    {isEdit && <Fl l="Reason for edit (required)"><input style={iS} value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Why is this being changed?" /></Fl>}
    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.bd}`, background: "#fff", color: P.m, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <Btn full disabled={!f.name.trim() || (isEdit && !editReason.trim())} onClick={() => onSave({ ...f, id: f.id })} sx={{ flex: 1 }}>Save</Btn>
    </div>
  </div>;
}

function ToolCoSheet({ tool, projs, userName, onClose, onSubmit }) {
  const [pId, setPId] = useState(""); const [nt, setNt] = useState("");
  return <Modal open={true} onClose={onClose} title={`Check Out: ${tool.name}`}>
    <Fl l="Checking out as"><div style={{ padding: "10px 14px", background: P.bg, borderRadius: 8, fontWeight: 600 }}>{userName}</div></Fl>
    <Fl l="Project"><select value={pId} onChange={e => setPId(e.target.value)} style={{ ...iS, appearance: "none" }}><option value="">Select...</option>{projs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Fl>
    <Fl l="Note"><input style={iS} value={nt} onChange={e => setNt(e.target.value)} /></Fl>
    <Btn full disabled={!pId} onClick={() => onSubmit(tool.id, tool.name, pId, nt)}>Check Out</Btn>
  </Modal>;
}

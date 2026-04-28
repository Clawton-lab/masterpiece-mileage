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
  try {
    await new Promise(r => setTimeout(r, 200));
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`,
      { headers: { "User-Agent": "MasterpieceMileageApp/1.0" } }
    );
    if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
    const d = await r.json();
    if (!d || d.length === 0) throw new Error("Address not found");
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch (e) {
    console.error("Geocode error:", e);
    return null;
  }
}

async function getDrivingMiles(from, to) {
  try {
    const a = await geocode(from);
    if (!a) throw new Error(`Could not geocode: ${from}`);
    await new Promise(r => setTimeout(r, 200));
    const b = await geocode(to);
    if (!b) throw new Error(`Could not geocode: ${to}`);
    await new Promise(r => setTimeout(r, 200));
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

function getPayPeriod(date, anchor) {
  const d = new Date(date);
  const a = new Date(anchor);
  const diff = Math.floor((d - a) / (14 * 86400000));
  const start = new Date(a.getTime() + diff * 14 * 86400000);
  const end = new Date(start.getTime() + 13 * 86400000);
  if (d < start) {
    start.setTime(start.getTime() - 14 * 86400000);
    end.setTime(end.getTime() - 14 * 86400000);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
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
  return new Date().toISOString().slice(0, 10);
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
    { k: "reports", l: "Reports" }
  ];
  if (admin) ts.push({ k: "admin", l: "Admin" });

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
            padding: "4px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === t.k ? P.red : P.lt,
            borderTop:
              tab === t.k ? `2px solid ${P.red}` : "2px solid transparent",
            marginTop: -2
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: Ft.m }}>
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
  const [aName, setAN] = useState("");
  const [aPin, setAP] = useState("");
  const [aEmail, setAE] = useState("");
  const [aErr, setAErr] = useState("");
  const [projs, setProjs] = useState([]);
  const [trips, setTrips] = useState([]);
  const [settings, setSettings] = useState({
    irs_rate: 0.70,
    pay_period_anchor: "2026-01-06"
  });
  const [users, setUsr] = useState([]);
  const [tab, setTab] = useState("log");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [calculating, setCalc] = useState(false);
  const [projMod, setProjMod] = useState(false);
  const [nPN, setNPN] = useState("");
  const [nPA, setNPA] = useState("");
  const [reportUser, setReportUser] = useState("all");
  const [reportPeriod, setReportPeriod] = useState("current");
  const [settingsRate, setSettingsRate] = useState("");
  const [settingsAnchor, setSettingsAnchor] = useState("");
  const [toast, setToast] = useState({ m: "", s: false });
  const [loaded, setLoaded] = useState(false);
  const [adPg, setAdPg] = useState("hub");
  const [adAuth, setAdAuth] = useState(false);
  const [aaName, setAAN] = useState("");
  const [aaPin, setAAP] = useState("");
  const [aaErr, setAAE] = useState("");
  const [editUser, setEU] = useState(null);
  const [euN, setEUN] = useState("");
  const [euE, setEUE] = useState("");
  const [euP, setEUP] = useState("");
  const [delUserMod, setDUM] = useState(null);
  const [rptAuth, setRptAuth] = useState(false);
  const [raName, setRAN] = useState("");
  const [raPin, setRAP] = useState("");
  const [raErr, setRAE] = useState("");
  const [emailMod, setEmailMod] = useState(false);
  const [emailTo, setEmailTo] = useState("");

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
        api("trips?order=created_at.desc&limit=500"),
        api("mileage_settings?limit=1"),
        api("yard_users?order=name")
      ]);
      setProjs(p);
      setTrips(t);
      setUsr(u);
      if (s && s.length > 0) {
        setSettings(s[0]);
        setSettingsRate(s[0].irs_rate.toString());
        setSettingsAnchor(s[0].pay_period_anchor);
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
      const miles = await getDrivingMiles(fromP.address, toP.address);
      if (!miles) {
        show("Couldn't calculate route. Check addresses.");
        setCalc(false);
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
          trip_date: today()
        })
      });
      await load();
      setFromId(toId);
      setToId("");
      setTripNote("");
      show(`${miles} mi logged — $${reimb.toFixed(2)}`);
    } catch (e) {
      show("Error logging trip");
    }
    setCalc(false);
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
  const pp = getPayPeriod(today(), settings.pay_period_anchor);
  const todayTrips = myTrips.filter(t => t.trip_date === today());
  const ppTrips = myTrips.filter(
    t => t.trip_date >= pp.start && t.trip_date <= pp.end
  );
  const ytdTrips = myTrips.filter(t => t.trip_date >= `${thisYear()}-01-01`);
  const todayMiles = todayTrips.reduce((s, t) => s + Number(t.miles), 0);
  const ppMiles = ppTrips.reduce((s, t) => s + Number(t.miles), 0);
  const ytdMiles = ytdTrips.reduce((s, t) => s + Number(t.miles), 0);

  const reportTrips = trips.filter(t => {
    if (reportUser !== "all" && t.user_id !== reportUser) return false;
    if (reportPeriod === "current")
      return t.trip_date >= pp.start && t.trip_date <= pp.end;
    if (reportPeriod === "ytd") return t.trip_date >= `${thisYear()}-01-01`;
    return true;
  });
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
      const subject = `Mileage Report - ${reportPeriod === 'current' ? 'Current Pay Period' : reportPeriod === 'ytd' ? 'Year to Date' : 'All Time'}`;
      const body = `Mileage Report\n\nPeriod: ${reportPeriod === 'current' ? `${fmtDate(pp.start)} - ${fmtDate(pp.end)}` : reportPeriod === 'ytd' ? `${thisYear()} YTD` : 'All Time'}\n${reportUser !== 'all' ? `Employee: ${users.find(u => u.id === reportUser)?.name}\n` : ''}Total Miles: ${reportMiles.toFixed(1)}\nTotal Reimbursement: $${reportReimb.toFixed(2)}\nTrips: ${reportTrips.length}\n\nCSV Report attached below:\n\n${csv}`;
      
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
              setAdAuth(false);
              setAdPg("hub");
              setRptAuth(false);
              setRAN("");
              setRAP("");
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
                IRS Rate: ${settings.irs_rate}/mile · Pay Period:{" "}
                {fmtDate(pp.start)} – {fmtDate(pp.end)}
              </div>
            </div>
            {isA && (
              <Btn
                small
                onClick={() => setProjMod(true)}
                color={P.blk}
                sx={{ marginBottom: 16 }}
              >
                + Add Project
              </Btn>
            )}
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
                {todayTrips.map(t => (
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
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "trips" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <h2
              style={{
                fontFamily: Ft.h,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 16px"
              }}
            >
              My Trips
            </h2>
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
                Pay Period: {fmtDate(pp.start)} – {fmtDate(pp.end)} · Rate: $
                {settings.irs_rate}/mi
              </div>
            </div>
            {myTrips.slice(0, 50).map(t => (
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
              </div>
            ))}
            {myTrips.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: P.lt,
                  fontFamily: Ft.m
                }}
              >
                No trips logged yet
              </div>
            )}
          </div>
        )}

        {tab === "reports" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {isA && !rptAuth ? (
              <div style={{ maxWidth: 340, margin: "40px auto", textAlign: "center" }}>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 20
                  }}
                >
                  Reports Access
                </h2>
                <Fl label="Name">
                  <input
                    style={iS}
                    value={raName}
                    onChange={e => setRAN(e.target.value)}
                  />
                </Fl>
                <Fl label="PIN">
                  <input
                    style={{
                      ...iS,
                      textAlign: "center",
                      fontSize: 24,
                      letterSpacing: 12,
                      fontFamily: Ft.m
                    }}
                    maxLength={4}
                    value={raPin}
                    onChange={e => setRAP(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="----"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (
                          raName.toLowerCase() === user.name.toLowerCase() &&
                          raPin === user.pin
                        )
                          setRptAuth(true);
                        else setRAE("Invalid.");
                      }
                    }}
                  />
                </Fl>
                {raErr && (
                  <div
                    style={{
                      color: P.red,
                      fontSize: 13,
                      marginBottom: 12,
                      fontFamily: Ft.m
                    }}
                  >
                    {raErr}
                  </div>
                )}
                <Btn
                  full
                  onClick={() => {
                    if (
                      raName.toLowerCase() === user.name.toLowerCase() &&
                      raPin === user.pin
                    )
                      setRptAuth(true);
                    else setRAE("Invalid.");
                  }}
                >
                  Unlock Reports
                </Btn>
              </div>
            ) : (
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
                    <option value="ytd">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
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
                  <Btn
                    small
                    onClick={exportCSV}
                    color={P.blk}
                  >
                    📥 Export CSV
                  </Btn>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      small
                      onClick={() => setEmailMod(true)}
                      color={P.blue}
                    >
                      ✉️ Email Report
                    </Btn>
                    <Btn
                      small
                      onClick={printReport}
                      color={P.tan}
                    >
                      🖨️ Print
                    </Btn>
                  </div>
                </div>
                {reportTrips.slice(0, 100).map(t => (
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
                      <button
                        onClick={() => deleteTrip(t.id)}
                        style={{
                          fontSize: 11,
                          color: P.lt,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          marginTop: 6,
                          fontFamily: Ft.m
                        }}
                        className="no-print"
                      >
                        Delete trip
                      </button>
                    )}
                  </div>
                ))}
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
            )}
          </div>
        )}

        {tab === "admin" && isA && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {!adAuth && (
              <div style={{ maxWidth: 340, margin: "40px auto", textAlign: "center" }}>
                <h2
                  style={{
                    fontFamily: Ft.h,
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 20
                  }}
                >
                  Admin Access
                </h2>
                <Fl label="Name">
                  <input
                    style={iS}
                    value={aaName}
                    onChange={e => setAAN(e.target.value)}
                  />
                </Fl>
                <Fl label="PIN">
                  <input
                    style={{
                      ...iS,
                      textAlign: "center",
                      fontSize: 24,
                      letterSpacing: 12,
                      fontFamily: Ft.m
                    }}
                    maxLength={4}
                    value={aaPin}
                    onChange={e => setAAP(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="----"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (
                          aaName.toLowerCase() === user.name.toLowerCase() &&
                          aaPin === user.pin
                        )
                          setAdAuth(true);
                        else setAAE("Invalid.");
                      }
                    }}
                  />
                </Fl>
                {aaErr && (
                  <div
                    style={{
                      color: P.red,
                      fontSize: 13,
                      marginBottom: 12,
                      fontFamily: Ft.m
                    }}
                  >
                    {aaErr}
                  </div>
                )}
                <Btn
                  full
                  onClick={() => {
                    if (
                      aaName.toLowerCase() === user.name.toLowerCase() &&
                      aaPin === user.pin
                    )
                      setAdAuth(true);
                    else setAAE("Invalid.");
                  }}
                >
                  Unlock
                </Btn>
              </div>
            )}

            {adAuth && adPg === "hub" && (
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
                  }
                ].map(p => (
                  <button
                    key={p.k}
                    onClick={() => setAdPg(p.k)}
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

            {adAuth && adPg === "employees" && (
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

            {adAuth && adPg === "settings" && (
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
                  <Fl label="Bi-weekly Anchor Date (any past pay period start date)">
                    <input
                      style={iS}
                      type="date"
                      value={settingsAnchor}
                      onChange={e => setSettingsAnchor(e.target.value)}
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
                    Enter the start date of any pay period. The app calculates all
                    other periods from this date in 2-week increments.
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

      <Nav
        tab={tab}
        set={t => {
          setTab(t);
          if (t !== "admin") {
            setAdPg("hub");
            setAdAuth(false);
            setAAN("");
            setAAP("");
          }
          if (t !== "reports") {
            setRptAuth(false);
            setRAN("");
            setRAP("");
          }
        }}
        admin={isA}
      />
      <Toast m={toast.m} s={toast.s} />
    </div>
  );
}

/**
 * FolioTrack — Mutual Fund Portfolio Tracker
 * Complete single-file React component
 *
 * Dependencies (all available in Claude artifacts / standard React setup):
 *   react, recharts, lucide-react
 *
 * Features:
 *   ✅ Add / Edit / Delete investments
 *   ✅ Auto-calculate units, current value, profit, return %
 *   ✅ Category allocation bar + donut chart
 *   ✅ Invested vs Current Value bar chart
 *   ✅ Return % horizontal bar chart
 *   ✅ LocalStorage persistence
 *   ✅ CSV export
 *   ✅ Search / filter
 *   ✅ Light + Dark mode aware
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  LayoutDashboard, Briefcase, BarChart2, Plus, Download,
  Edit2, Trash2, X, Check, Search, Repeat, TrendingUp,
  TrendingDown, ChevronRight, AlertCircle
} from "lucide-react";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = "foliotrack_v2";

const CATEGORIES = ["Equity", "Debt", "Hybrid", "ELSS", "Liquid"];

const CAT_COLORS = {
  Equity: "#1A4E8C",
  Debt:   "#B8860B",
  Hybrid: "#1D5C3A",
  ELSS:   "#D4730A",
  Liquid: "#7A7265",
};

const CAT_BG = {
  Equity: "#EBF1FA",
  Debt:   "#FDF8E7",
  Hybrid: "#E8F3ED",
  ELSS:   "#FEF3E6",
  Liquid: "#F1EFE8",
};

const SEED_DATA = [
  { id: 1, name: "Mirae Asset Large Cap",    amount: 50000, buyNav: 72.50, curNav: 91.30, date: "2023-04-10", cat: "Equity", sip: 18 },
  { id: 2, name: "Axis Bluechip Fund",        amount: 30000, buyNav: 45.20, curNav: 52.80, date: "2023-08-01", cat: "Equity", sip: 12 },
  { id: 3, name: "HDFC Short Term Debt",      amount: 25000, buyNav: 24.10, curNav: 26.50, date: "2024-01-15", cat: "Debt",   sip: 6  },
  { id: 4, name: "Parag Parikh Flexi Cap",    amount: 40000, buyNav: 58.00, curNav: 74.20, date: "2023-06-20", cat: "Hybrid", sip: 15 },
  { id: 5, name: "Quant ELSS Tax Saver",      amount: 15000, buyNav: 220.50,curNav: 280.00,date: "2024-03-31", cat: "ELSS",   sip: 4  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function compute(inv) {
  const units        = inv.amount / inv.buyNav;
  const currentValue = units * inv.curNav;
  const profit       = currentValue - inv.amount;
  const returnPct    = (profit / inv.amount) * 100;
  return { units, currentValue, profit, returnPct };
}

function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function fmtD(n, d = 2) {
  return n.toFixed(d);
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function exportCSV(investments) {
  if (!investments.length) return false;
  const headers = ["Fund Name","Category","Date","Invested","Buy NAV","Current NAV","Units","Current Value","Profit","Return %","SIP Count"];
  const rows = investments.map(inv => {
    const c = compute(inv);
    return [
      `"${inv.name}"`, inv.cat, inv.date,
      Math.round(inv.amount), inv.buyNav, inv.curNav,
      fmtD(c.units, 4), Math.round(c.currentValue),
      Math.round(c.profit), fmtD(c.returnPct, 2) + "%", inv.sip
    ].join(",");
  });
  const csv  = [headers.join(","), ...rows].join("\n");
  const link = document.createElement("a");
  link.href     = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  link.download = "foliotrack_" + todayISO() + ".csv";
  link.click();
  return true;
}

// ─────────────────────────────────────────────
// Styles (CSS-in-JS via style tags injected once)
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:           #F4F1EA;
    --surface:      #FDFCF8;
    --surface2:     #EEEBE2;
    --border:       rgba(60,50,30,0.10);
    --border-md:    rgba(60,50,30,0.18);
    --text:         #1C1A14;
    --text-muted:   #7A7265;
    --text-faint:   #B5AFA3;
    --accent:       #1D5C3A;
    --accent-l:     #E8F3ED;
    --accent-mid:   #2D8A59;
    --danger:       #C0392B;
    --danger-l:     #FDECEA;
    --warning:      #D4730A;
    --gold:         #B8860B;
    --blue:         #1A4E8C;
    --radius:       12px;
    --radius-sm:    8px;
    --shadow:       0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg:           #0F0E0B;
      --surface:      #1A1915;
      --surface2:     #242218;
      --border:       rgba(255,248,230,0.07);
      --border-md:    rgba(255,248,230,0.14);
      --text:         #F0EDE4;
      --text-muted:   #9A9488;
      --text-faint:   #5A5650;
      --accent:       #4CAF7A;
      --accent-l:     #0D2419;
      --accent-mid:   #3D9A68;
      --danger:       #E05A4E;
      --danger-l:     #2A1210;
      --warning:      #F0923A;
      --gold:         #D4A830;
      --blue:         #4A8FD4;
    }
  }

  html, body, #root { height: 100%; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
  }

  button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
  input, select { font-family: 'DM Sans', sans-serif; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-md); border-radius: 99px; }

  .ft-app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  /* Header */
  .ft-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; height: 58px; flex-shrink: 0;
    background: var(--surface);
    border-bottom: 0.5px solid var(--border-md);
    position: relative; z-index: 50;
  }
  .ft-brand { display: flex; align-items: center; gap: 10px; }
  .ft-logo {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--accent); display: flex; align-items: center; justify-content: center;
    font-family: 'DM Serif Display', serif; color: #fff; font-size: 15px;
  }
  .ft-brand-name { font-family: 'DM Serif Display', serif; font-size: 18px; letter-spacing: -0.3px; }

  /* Body layout */
  .ft-body { display: flex; flex: 1; overflow: hidden; }

  /* Sidebar */
  .ft-sidebar {
    width: 216px; flex-shrink: 0;
    background: var(--surface); border-right: 0.5px solid var(--border);
    padding: 16px 10px; display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
  }
  .ft-nav-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
    text-transform: uppercase; color: var(--text-faint);
    padding: 8px 8px 4px;
  }
  .ft-nav-item {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500; color: var(--text-muted);
    background: none; border: none; width: 100%; text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .ft-nav-item:hover { background: var(--surface2); color: var(--text); }
  .ft-nav-item.active { background: var(--accent-l); color: var(--accent); }
  .ft-nav-divider { height: 0.5px; background: var(--border); margin: 8px 2px; }

  /* Content */
  .ft-content { flex: 1; overflow-y: auto; padding: 24px; }

  /* Buttons */
  .ft-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--radius-sm);
    border: 0.5px solid var(--border-md); background: transparent; color: var(--text);
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background 0.12s, opacity 0.12s;
    white-space: nowrap;
  }
  .ft-btn:hover { background: var(--surface2); }
  .ft-btn-sm { padding: 5px 10px; font-size: 12px; }
  .ft-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .ft-btn-primary:hover { opacity: 0.88; background: var(--accent); }
  .ft-btn-danger { color: var(--danger); border-color: var(--danger); }
  .ft-btn-danger:hover { background: var(--danger-l); }
  .ft-btn-ghost { border-color: transparent; }
  .ft-btn-ghost:hover { background: var(--surface2); border-color: var(--border); }

  /* Summary cards */
  .ft-summary-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px; margin-bottom: 22px;
  }
  .ft-card {
    background: var(--surface); border: 0.5px solid var(--border);
    border-radius: var(--radius); padding: 16px;
  }
  .ft-card-label { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; margin-bottom: 5px; }
  .ft-card-value {
    font-size: 22px; font-weight: 600; font-family: 'DM Serif Display', serif;
    letter-spacing: -0.5px; line-height: 1.1;
  }
  .ft-card-sub { font-size: 11px; font-weight: 500; margin-top: 4px; }

  /* Allocation bar */
  .ft-alloc-bar {
    display: flex; height: 7px; border-radius: 99px; overflow: hidden;
    background: var(--surface2); margin: 8px 0 10px;
  }
  .ft-alloc-seg { height: 100%; transition: width 0.4s; }
  .ft-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  .ft-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
  .ft-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

  /* Section header */
  .ft-section-hdr {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .ft-section-title { font-family: 'DM Serif Display', serif; font-size: 20px; letter-spacing: -0.3px; }

  /* Table */
  .ft-table-wrap {
    background: var(--surface); border: 0.5px solid var(--border);
    border-radius: var(--radius); overflow: hidden; margin-bottom: 22px;
  }
  .ft-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ft-table thead tr { background: var(--surface2); border-bottom: 0.5px solid var(--border-md); }
  .ft-table th {
    padding: 9px 12px; text-align: left; font-size: 10.5px;
    font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
    color: var(--text-muted); white-space: nowrap;
  }
  .ft-table td {
    padding: 11px 12px; border-bottom: 0.5px solid var(--border);
    color: var(--text); vertical-align: middle;
  }
  .ft-table tbody tr:last-child td { border-bottom: none; }
  .ft-table tbody tr { transition: background 0.1s; }
  .ft-table tbody tr:hover td { background: var(--surface2); }

  /* Category badge */
  .ft-cat-badge {
    display: inline-block; font-size: 10px; padding: 2px 7px;
    border-radius: 99px; font-weight: 600; margin-top: 2px; white-space: nowrap;
  }

  /* SIP badge */
  .ft-sip-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; padding: 2px 6px; border-radius: 99px;
    background: var(--accent-l); color: var(--accent); font-weight: 600;
  }

  /* Return pill */
  .ft-ret-pill { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; }

  /* Positive / Negative */
  .pos { color: var(--accent-mid); }
  .neg { color: var(--danger); }
  .muted { color: var(--text-muted); }

  /* Empty state */
  .ft-empty {
    text-align: center; padding: 52px 24px; color: var(--text-muted);
  }
  .ft-empty svg { margin-bottom: 12px; color: var(--text-faint); }
  .ft-empty h3 { font-family: 'DM Serif Display', serif; font-size: 18px; color: var(--text); margin-bottom: 6px; }
  .ft-empty p { font-size: 13px; }

  /* Form */
  .ft-form-card {
    background: var(--surface); border: 0.5px solid var(--border);
    border-radius: var(--radius); padding: 24px; margin-bottom: 22px;
  }
  .ft-form-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 14px; margin-bottom: 14px;
  }
  .ft-form-group { display: flex; flex-direction: column; gap: 5px; }
  .ft-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.2px; }
  .ft-input {
    padding: 8px 11px; border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm); background: var(--bg); color: var(--text);
    font-size: 13px; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
  }
  .ft-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-l); }
  .ft-input::placeholder { color: var(--text-faint); }

  /* Calc preview */
  .ft-calc-preview {
    background: var(--accent-l); border: 0.5px solid rgba(29,92,58,0.18);
    border-radius: var(--radius-sm); padding: 12px 16px;
    display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 14px;
  }
  .ft-calc-label { font-size: 10px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .ft-calc-val { font-size: 16px; font-weight: 600; font-family: 'DM Serif Display', serif; }

  /* Charts */
  .ft-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .ft-chart-card { background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .ft-chart-title { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 16px; letter-spacing: 0.2px; }

  /* Modal overlay */
  .ft-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.48); z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .ft-modal {
    background: var(--surface); border-radius: var(--radius);
    border: 0.5px solid var(--border-md); padding: 24px;
    width: 520px; max-width: 100%;
    box-shadow: var(--shadow);
  }
  .ft-modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ft-modal-title { font-family: 'DM Serif Display', serif; font-size: 18px; }

  /* Toast */
  .ft-toast {
    position: fixed; bottom: 20px; right: 20px;
    background: var(--text); color: var(--bg);
    padding: 9px 16px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500; z-index: 400;
    animation: ft-toast-in 0.25s ease;
  }
  @keyframes ft-toast-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Responsive */
  @media (max-width: 760px) {
    .ft-sidebar { display: none; }
    .ft-charts-grid { grid-template-columns: 1fr; }
  }
`;

// ─────────────────────────────────────────────
// Inject CSS once
// ─────────────────────────────────────────────
let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

// ─────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="ft-toast">{msg}</div>;
}

// ─────────────────────────────────────────────
// Category Badge
// ─────────────────────────────────────────────
function CatBadge({ cat }) {
  return (
    <span
      className="ft-cat-badge"
      style={{ background: CAT_BG[cat] || "#eee", color: CAT_COLORS[cat] || "#555" }}
    >
      {cat}
    </span>
  );
}

// ─────────────────────────────────────────────
// Calc Preview
// ─────────────────────────────────────────────
function CalcPreview({ amount, buyNav, curNav }) {
  if (!amount || !buyNav || !curNav || buyNav <= 0) return null;
  const units = amount / buyNav;
  const cv    = units * curNav;
  const pr    = cv - amount;
  const ret   = (pr / amount) * 100;
  return (
    <div className="ft-calc-preview">
      <div>
        <div className="ft-calc-label">Units</div>
        <div className="ft-calc-val">{fmtD(units, 3)}</div>
      </div>
      <div>
        <div className="ft-calc-label">Current Value</div>
        <div className="ft-calc-val">{fmt(cv)}</div>
      </div>
      <div>
        <div className="ft-calc-label">Profit / Loss</div>
        <div className={`ft-calc-val ${pr >= 0 ? "pos" : "neg"}`}>
          {pr >= 0 ? "+" : ""}{fmt(pr)}
        </div>
      </div>
      <div>
        <div className="ft-calc-label">Return %</div>
        <div className={`ft-calc-val ${ret >= 0 ? "pos" : "neg"}`}>
          {ret >= 0 ? "+" : ""}{fmtD(ret, 2)}%
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Investment Form (shared by Add + Edit)
// ─────────────────────────────────────────────
const EMPTY_FORM = { name: "", cat: "Equity", date: todayISO(), amount: "", buyNav: "", curNav: "", sip: "" };

function InvestmentForm({ initial = EMPTY_FORM, onSave, onCancel, title }) {
  const [f, setF] = useState(initial);

  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = () => {
    const { name, amount, buyNav, curNav, date, cat, sip } = f;
    if (!name.trim() || !amount || !buyNav || !curNav || !date) return false;
    onSave({
      name: name.trim(), cat, date,
      amount: parseFloat(amount),
      buyNav:  parseFloat(buyNav),
      curNav:  parseFloat(curNav),
      sip:     parseInt(sip) || 1,
    });
  };

  return (
    <div>
      {title && (
        <div className="ft-modal-hdr">
          <span className="ft-modal-title">{title}</span>
          {onCancel && (
            <button className="ft-btn ft-btn-ghost ft-btn-sm" onClick={onCancel} aria-label="Close">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="ft-form-grid">
        <div className="ft-form-group" style={{ gridColumn: "span 2" }}>
          <label className="ft-label">Fund name</label>
          <input className="ft-input" type="text" placeholder="e.g. Mirae Asset Large Cap" value={f.name} onChange={set("name")} />
        </div>
        <div className="ft-form-group">
          <label className="ft-label">Category</label>
          <select className="ft-input" value={f.cat} onChange={set("cat")}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ft-form-group">
          <label className="ft-label">Investment date</label>
          <input className="ft-input" type="date" value={f.date} onChange={set("date")} />
        </div>
        <div className="ft-form-group">
          <label className="ft-label">Invested amount (₹)</label>
          <input className="ft-input" type="number" placeholder="50000" value={f.amount} onChange={set("amount")} />
        </div>
        <div className="ft-form-group">
          <label className="ft-label">Buy NAV (₹)</label>
          <input className="ft-input" type="number" step="0.01" placeholder="35.50" value={f.buyNav} onChange={set("buyNav")} />
        </div>
        <div className="ft-form-group">
          <label className="ft-label">Current NAV (₹)</label>
          <input className="ft-input" type="number" step="0.01" placeholder="42.80" value={f.curNav} onChange={set("curNav")} />
        </div>
        <div className="ft-form-group">
          <label className="ft-label">SIP count (months)</label>
          <input className="ft-input" type="number" placeholder="12" min="1" value={f.sip} onChange={set("sip")} />
        </div>
      </div>

      <CalcPreview
        amount={parseFloat(f.amount)}
        buyNav={parseFloat(f.buyNav)}
        curNav={parseFloat(f.curNav)}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button className="ft-btn ft-btn-primary" onClick={handleSave}>
          <Check size={14} /> Save
        </button>
        {onCancel && (
          <button className="ft-btn" onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Fund Table Row
// ─────────────────────────────────────────────
function FundRow({ inv, onEdit, onDelete }) {
  const c = compute(inv);
  const isPos = c.returnPct >= 0;
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500 }}>{inv.name}</div>
        <CatBadge cat={inv.cat} />
      </td>
      <td className="muted">{new Date(inv.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
      <td>{fmt(inv.amount)}</td>
      <td className="muted">{fmtD(c.units, 3)}</td>
      <td className="muted" style={{ fontSize: 12 }}>₹{fmtD(inv.buyNav, 2)} → ₹{fmtD(inv.curNav, 2)}</td>
      <td style={{ fontWeight: 500 }}>{fmt(c.currentValue)}</td>
      <td>
        <span className={`ft-ret-pill ${isPos ? "pos" : "neg"}`}>
          {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(c.returnPct).toFixed(2)}%
        </span>
      </td>
      <td>
        <span className="ft-sip-badge">
          <Repeat size={10} /> {inv.sip}
        </span>
      </td>
      {(onEdit || onDelete) && (
        <td>
          <div style={{ display: "flex", gap: 4 }}>
            {onEdit  && <button className="ft-btn ft-btn-sm" onClick={() => onEdit(inv)}  aria-label="Edit"><Edit2  size={12} /></button>}
            {onDelete && <button className="ft-btn ft-btn-sm ft-btn-danger" onClick={() => onDelete(inv.id)} aria-label="Delete"><Trash2 size={12} /></button>}
          </div>
        </td>
      )}
    </tr>
  );
}

// ─────────────────────────────────────────────
// Fund Table
// ─────────────────────────────────────────────
function FundTable({ investments, onEdit, onDelete }) {
  if (!investments.length) {
    return (
      <div className="ft-table-wrap">
        <div className="ft-empty">
          <Briefcase size={36} />
          <h3>No investments found</h3>
          <p>Add your first SIP or adjust your search.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ft-table-wrap" style={{ overflowX: "auto" }}>
      <table className="ft-table">
        <thead>
          <tr>
            <th>Fund</th><th>Date</th><th>Invested</th>
            <th>Units</th><th>NAV</th><th>Current Value</th>
            <th>Return</th><th>SIPs</th>
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {investments.map(inv => (
            <FundRow key={inv.id} inv={inv} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────────
function Dashboard({ investments, onNavigate }) {
  const totals = useMemo(() => {
    let invested = 0, current = 0, profit = 0, sips = 0;
    investments.forEach(inv => {
      const c = compute(inv);
      invested += inv.amount;
      current  += c.currentValue;
      profit   += c.profit;
      sips     += inv.sip;
    });
    const ret = invested > 0 ? (profit / invested) * 100 : 0;
    return { invested, current, profit, ret, sips };
  }, [investments]);

  const catMap = useMemo(() => {
    const m = {};
    investments.forEach(inv => { m[inv.cat] = (m[inv.cat] || 0) + inv.amount; });
    return m;
  }, [investments]);

  const recent = useMemo(() => [...investments].sort((a, b) => b.id - a.id).slice(0, 5), [investments]);

  return (
    <div>
      <div className="ft-section-hdr" style={{ marginBottom: 18 }}>
        <h1 className="ft-section-title">Portfolio Overview</h1>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="ft-summary-grid">
        <div className="ft-card">
          <div className="ft-card-label">Total Invested</div>
          <div className="ft-card-value">{investments.length ? fmt(totals.invested) : "—"}</div>
          <div className="ft-card-sub muted">{investments.length} fund{investments.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="ft-card">
          <div className="ft-card-label">Current Value</div>
          <div className="ft-card-value">{investments.length ? fmt(totals.current) : "—"}</div>
          <div className={`ft-card-sub ${totals.ret >= 0 ? "pos" : "neg"}`}>
            {investments.length ? `${totals.ret >= 0 ? "+" : ""}${fmtD(totals.ret, 2)}% overall` : ""}
          </div>
        </div>
        <div className="ft-card">
          <div className="ft-card-label">Profit / Loss</div>
          <div className={`ft-card-value ${totals.profit >= 0 ? "pos" : "neg"}`}>
            {investments.length ? `${totals.profit >= 0 ? "+" : ""}${fmt(totals.profit)}` : "—"}
          </div>
          <div className="ft-card-sub muted">&nbsp;</div>
        </div>
        <div className="ft-card">
          <div className="ft-card-label">Total SIP Count</div>
          <div className="ft-card-value">{totals.sips || "—"}</div>
          <div className="ft-card-sub muted">instalments</div>
        </div>
      </div>

      {/* Allocation bar */}
      {investments.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Category allocation</div>
          <div className="ft-alloc-bar">
            {Object.entries(catMap).map(([cat, amt]) => (
              <div
                key={cat}
                className="ft-alloc-seg"
                style={{ width: `${(amt / totals.invested * 100).toFixed(1)}%`, background: CAT_COLORS[cat] }}
              />
            ))}
          </div>
          <div className="ft-legend">
            {Object.entries(catMap).map(([cat, amt]) => (
              <span key={cat} className="ft-legend-item">
                <span className="ft-legend-dot" style={{ background: CAT_COLORS[cat] }} />
                {cat} {(amt / totals.invested * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </>
      )}

      {/* Recent */}
      <div className="ft-section-hdr">
        <div style={{ fontSize: 15, fontWeight: 600 }}>Recent investments</div>
        <button className="ft-btn ft-btn-sm ft-btn-ghost" onClick={() => onNavigate("portfolio")}>
          View all <ChevronRight size={13} />
        </button>
      </div>
      <FundTable investments={recent} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Portfolio Page
// ─────────────────────────────────────────────
function Portfolio({ investments, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => investments.filter(inv => inv.name.toLowerCase().includes(q.toLowerCase())),
    [investments, q]
  );
  return (
    <div>
      <div className="ft-section-hdr">
        <h1 className="ft-section-title">My Portfolio</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
            <input
              className="ft-input"
              style={{ paddingLeft: 28, width: 200 }}
              placeholder="Search funds…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>
      <FundTable investments={filtered} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Analytics Page
// ─────────────────────────────────────────────
const RECH_TOOLTIP_STYLE = {
  background: "var(--surface)", border: "0.5px solid var(--border-md)",
  borderRadius: 8, fontSize: 12, color: "var(--text)",
};

function Analytics({ investments }) {
  const catData = useMemo(() => {
    const m = {};
    investments.forEach(inv => { m[inv.cat] = (m[inv.cat] || 0) + Math.round(inv.amount); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [investments]);

  const barData = useMemo(() =>
    investments.map(inv => {
      const c = compute(inv);
      return {
        name: inv.name.length > 16 ? inv.name.slice(0, 16) + "…" : inv.name,
        Invested: Math.round(inv.amount),
        Current:  Math.round(c.currentValue),
      };
    }), [investments]);

  const retData = useMemo(() =>
    investments.map(inv => ({
      name: inv.name.length > 18 ? inv.name.slice(0, 18) + "…" : inv.name,
      Return: parseFloat(compute(inv).returnPct.toFixed(2)),
    })).sort((a, b) => b.Return - a.Return),
    [investments]
  );

  if (!investments.length) {
    return (
      <div>
        <h1 className="ft-section-title" style={{ marginBottom: 20 }}>Analytics</h1>
        <div className="ft-card">
          <div className="ft-empty">
            <BarChart2 size={36} />
            <h3>No data yet</h3>
            <p>Add investments to see charts here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="ft-section-title" style={{ marginBottom: 20 }}>Analytics</h1>

      <div className="ft-charts-grid">
        {/* Donut */}
        <div className="ft-chart-card">
          <div className="ft-chart-title">Category allocation (₹ invested)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {catData.map(entry => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] || "#888"} />
                ))}
              </Pie>
              <Tooltip contentStyle={RECH_TOOLTIP_STYLE} formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="ft-legend" style={{ justifyContent: "center" }}>
            {catData.map(d => (
              <span key={d.name} className="ft-legend-item">
                <span className="ft-legend-dot" style={{ background: CAT_COLORS[d.name] }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Invested vs Current */}
        <div className="ft-chart-card">
          <div className="ft-chart-title">Invested vs Current value</div>
          <div className="ft-legend" style={{ marginBottom: 8 }}>
            <span className="ft-legend-item"><span className="ft-legend-dot" style={{ background: "#1A4E8C" }} /> Invested</span>
            <span className="ft-legend-item"><span className="ft-legend-dot" style={{ background: "#1D5C3A" }} /> Current</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip contentStyle={RECH_TOOLTIP_STYLE} formatter={v => fmt(v)} />
              <Bar dataKey="Invested" fill="#1A4E8C" radius={[4,4,0,0]} />
              <Bar dataKey="Current"  fill="#1D5C3A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Return % */}
        <div className="ft-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="ft-chart-title">Return % by fund</div>
          <ResponsiveContainer width="100%" height={Math.max(180, investments.length * 44)}>
            <BarChart data={retData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={v => v + "%"} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={150} />
              <Tooltip contentStyle={RECH_TOOLTIP_STYLE} formatter={v => v.toFixed(2) + "%"} />
              <Bar dataKey="Return" radius={[0,4,4,0]}>
                {retData.map(entry => (
                  <Cell key={entry.name} fill={entry.Return >= 0 ? "#1D5C3A" : "#C0392B"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Investment Page
// ─────────────────────────────────────────────
function AddInvestment({ onAdd }) {
  const [key, setKey] = useState(0); // remount form to reset
  return (
    <div>
      <h1 className="ft-section-title" style={{ marginBottom: 20 }}>Add Investment</h1>
      <div className="ft-form-card">
        <InvestmentForm
          key={key}
          onSave={inv => { onAdd(inv); setKey(k => k + 1); }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────
function EditModal({ inv, onSave, onClose }) {
  if (!inv) return null;
  const initial = {
    name:   inv.name,
    cat:    inv.cat,
    date:   inv.date,
    amount: String(inv.amount),
    buyNav: String(inv.buyNav),
    curNav: String(inv.curNav),
    sip:    String(inv.sip),
  };
  return (
    <div className="ft-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ft-modal">
        <InvestmentForm
          title="Edit Investment"
          initial={initial}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="ft-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ft-modal" style={{ width: 360 }}>
        <div className="ft-modal-hdr">
          <span className="ft-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} style={{ color: "var(--danger)" }} /> Confirm delete
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="ft-btn" onClick={onClose}>Cancel</button>
          <button className="ft-btn ft-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Nav items config
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",    Icon: LayoutDashboard },
  { id: "portfolio", label: "Portfolio",    Icon: Briefcase       },
  { id: "analytics", label: "Analytics",   Icon: BarChart2       },
  { id: "add",       label: "Add Investment", Icon: Plus          },
];

// ─────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────
export default function FolioTrack() {
  injectCSS();

  const [investments, setInvestments] = useState(() => {
    const stored = loadFromStorage();
    return stored ?? SEED_DATA;
  });
  const [page, setPage]         = useState("dashboard");
  const [editInv, setEditInv]   = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast]       = useState(null);

  useEffect(() => { saveToStorage(investments); }, [investments]);

  const showToast = useCallback((msg) => {
    setToast(msg);
  }, []);

  const navigate = useCallback((p) => setPage(p), []);

  const handleAdd = useCallback((inv) => {
    setInvestments(prev => [...prev, { ...inv, id: Date.now() }]);
    showToast("Investment added!");
    setPage("portfolio");
  }, [showToast]);

  const handleEditOpen  = useCallback((inv)  => setEditInv(inv),  []);
  const handleEditClose = useCallback(() => setEditInv(null),       []);
  const handleEditSave  = useCallback((data) => {
    setInvestments(prev => prev.map(inv => inv.id === editInv.id ? { ...inv, ...data } : inv));
    setEditInv(null);
    showToast("Investment updated!");
  }, [editInv, showToast]);

  const handleDeleteAsk  = useCallback((id)  => setDeleteId(id),  []);
  const handleDeleteClose = useCallback(() => setDeleteId(null),   []);
  const handleDeleteConfirm = useCallback(() => {
    setInvestments(prev => prev.filter(inv => inv.id !== deleteId));
    setDeleteId(null);
    showToast("Investment removed.");
  }, [deleteId, showToast]);

  const handleExport = useCallback(() => {
    const ok = exportCSV(investments);
    showToast(ok ? "CSV exported!" : "Nothing to export.");
  }, [investments, showToast]);

  const deleteTarget = investments.find(inv => inv.id === deleteId);

  return (
    <div className="ft-app">
      {/* Header */}
      <header className="ft-header">
        <div className="ft-brand">
          <div className="ft-logo">F</div>
          <span className="ft-brand-name">FolioTrack</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ft-btn ft-btn-sm" onClick={handleExport}>
            <Download size={13} /> Export CSV
          </button>
          <button className="ft-btn ft-btn-sm ft-btn-primary" onClick={() => navigate("add")}>
            <Plus size={13} /> Add SIP
          </button>
        </div>
      </header>

      <div className="ft-body">
        {/* Sidebar */}
        <aside className="ft-sidebar" role="navigation" aria-label="Main navigation">
          <div className="ft-nav-label">Overview</div>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`ft-nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
          <div className="ft-nav-divider" />
          <div className="ft-nav-label" style={{ marginTop: 4 }}>Data</div>
          <button className="ft-nav-item" onClick={handleExport}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        </aside>

        {/* Main content */}
        <main className="ft-content">
          {page === "dashboard" && <Dashboard investments={investments} onNavigate={navigate} />}
          {page === "portfolio" && <Portfolio investments={investments} onEdit={handleEditOpen} onDelete={handleDeleteAsk} />}
          {page === "analytics" && <Analytics investments={investments} />}
          {page === "add"       && <AddInvestment onAdd={handleAdd} />}
        </main>
      </div>

      {/* Edit Modal */}
      {editInv && <EditModal inv={editInv} onSave={handleEditSave} onClose={handleEditClose} />}

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmModal
          message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onClose={handleDeleteClose}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
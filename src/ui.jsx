// Small reusable primitives. Sized to Linear.app: root is 18px, body is 0.9375rem (16.875px).
import React from "react";
import { navigate } from "./router";

// Canonical Tailwind class for table column headers.
// Matches Linear's data-table convention: small, muted, regular case, no tracking —
// the row content is the hero, headers should barely register.
// (Uppercase + tracking is Linear's *sidebar-label* style, too shouty for tables
// and causes narrower columns to wrap on two-word headers like "Buy / Sell mix".)
export const TABLE_HEADER_CLS = "text-mini font-medium text-ink_muted";

// Soft zebra striping for data tables. Adds a near-invisible band to every other
// row — the eye catches the pattern and tracks rows across columns without the
// noise of full vertical gridlines (which feel Excel-era on a Linear-style canvas).
export const TABLE_ZEBRA_CLS = "[&>*:nth-child(even)]:bg-muted/30";

// Strip the parser garbage that frequently leaks into House PTR asset_name strings.
// Examples handled:
//   "Tesla, Inc. (Tsla) [sT]s (partial)08/03/2018..." → "Tesla, Inc."
//   "DCadvanced Micro Devices, Inc." → "advanced Micro Devices, Inc."
//   "Gains > $200? GE HealthCare Technologies Inc." → "GE HealthCare Technologies Inc."
//   "F S: New Tapestry, Inc. Common Stock" → "New Tapestry, Inc. Common Stock"
//   "MARRIOTT INTL INC NEW SER LL NOTE 5.45000% 09/15/2026 (571903BM4) [CS]" → drops the [CS] tail
// Clean strings without garbage pass through unchanged.
export function cleanAssetName(s) {
  if (!s) return s;
  let out = String(s).trim();
  // "Gains > $200?" is a PTR form question that OCR pulls into the asset field.
  out = out.replace(/^Gains\s*[>≥]\s*\$?\d+\??\s*/i, "");
  // "F S:", "J T:" etc are short field-code prefixes (filing-type letters + colon).
  out = out.replace(/^[A-Z]\s[A-Z]:\s*/, "");
  // Owner-field codes (DC/SP/JT/DJ) glued onto the name without a space.
  out = out.replace(/^(?:DC|SP|JT|DJ)(?=[a-z])/, "");
  // Anything after a square-bracket type tag is parser trailer.
  const bracket = out.indexOf(" [");
  if (bracket > 0) out = out.slice(0, bracket).trim();
  // Trailing "(TSLA)" / "(NVDA)"-style ticker echo.
  out = out.replace(/\s\([A-Za-z]{2,5}\)\s*$/, "").trim();
  // A leading comma/period + lowercase means we're looking at a sentence
  // fragment that bled in from the PTR comment field. Nothing we can salvage.
  if (/^[,.]\s|^[a-z]/.test(out)) out = "";
  return out;
}

export function fmtUSD(n, signed = false) {
  if (!n && n !== 0) return "--";
  const s = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${s}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${s}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${s}$${(abs / 1e3).toFixed(0)}K`;
  return `${s}$${abs}`;
}

export function fmtInt(n) {
  if (!n && n !== 0) return "--";
  return n.toLocaleString();
}

export function pct(n, digits = 0) {
  if (n == null) return "--";
  return `${n.toFixed(digits)}%`;
}

// Categorical chip. Linear uses lightly-rounded squares (4px radius), regular
// weight, translucent color backgrounds — not capsule shapes with bold text.
// The semantic `buy/sell/warn` tones keep the same rounded-square shape too,
// since our earlier capsule pill read as "loud status chip" rather than a
// calm category label.
export function Pill({ tone = "neutral", children, size = "default" }) {
  const toneCls = {
    neutral: "bg-muted text-ink_muted",
    blue: "bg-[lch(93%_8_265)] text-[lch(38%_20_265)]",
    violet: "bg-[lch(93%_8_300)] text-[lch(38%_25_295)]",
    amber: "bg-[lch(94%_12_70)] text-[lch(38%_30_55)]",
    buy: "bg-buy_bg text-buy",
    sell: "bg-sell_bg text-sell",
    warn: "bg-warn_bg text-warn",
  }[tone];
  const sz = size === "xs" ? "text-[0.6875rem] px-[5px] py-[1px]" : "text-mini px-[6px] py-[2px]";
  return <span className={`inline-flex items-center rounded-[4px] font-[450] ${sz} ${toneCls}`}>{children}</span>;
}

export function sourcePill(source) {
  if (source === "house_clerk") return { tone: "blue", label: "House" };
  if (source === "senate_efd") return { tone: "violet", label: "Senate" };
  if (source === "oge_executive") return { tone: "amber", label: "Exec" };
  return { tone: "neutral", label: source };
}

export function branchPill(filer) {
  if (filer.branch === "executive") return { tone: "amber", label: "Exec" };
  if (filer.chamber === "senate") return { tone: "violet", label: "Senate" };
  return { tone: "blue", label: "House" };
}

export function Link({ to, className = "", children, onClick, ...rest }) {
  return (
    <a
      href={to}
      className={`text-accent hover:underline underline-offset-2 ${className}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

// Linear-style card: white surface, 1px border in --bg-border-color, 8px radius, no shadow.
export function Card({ children, className = "" }) {
  return <div className={`border border-stroke rounded-md bg-panel ${className}`}>{children}</div>;
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <div>
        <h2 className="text-large font-semibold text-ink tracking-[-0.005em]">{title}</h2>
        {subtitle && <p className="text-small text-ink_muted mt-[2px]">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function txnTone(type) {
  if (!type) return "neutral";
  const t = type.toLowerCase();
  if (t.includes("urchase") || t === "p") return "buy";
  if (t.includes("ale") || t === "s") return "sell";
  return "neutral";
}

export function txnColor(type) {
  if (!type) return "text-ink_muted";
  const t = type.toLowerCase();
  if (t.includes("urchase") || t === "p") return "text-buy";
  if (t.includes("ale") || t === "s") return "text-sell";
  return "text-ink_muted";
}

// Linear-style property row label - 14.625px, weight 500, tertiary grey, sentence case.
export function PropertyLabel({ children, className = "" }) {
  return <div className={`text-small font-medium text-ink_muted ${className}`}>{children}</div>;
}

// U.S. presidential administrations. `start` is the inauguration ISO date.
// `end` is exclusive — left null for the current admin so filtering works.
export const ADMINISTRATIONS = [
  { k: "all", label: "All time", short: "All", start: null, end: null },
  { k: "trump2", label: "Trump II", short: "Trump II", start: "2025-01-20", end: null, party: "R" },
  { k: "biden", label: "Biden", short: "Biden", start: "2021-01-20", end: "2025-01-20", party: "D" },
  { k: "trump1", label: "Trump I", short: "Trump I", start: "2017-01-20", end: "2021-01-20", party: "R" },
  { k: "obama", label: "Obama", short: "Obama", start: "2009-01-20", end: "2017-01-20", party: "D" },
];

export function findAdmin(k) {
  return ADMINISTRATIONS.find((a) => a.k === k) || ADMINISTRATIONS[0];
}

// Was the ISO date `d` (YYYY-MM-DD) inside this administration?
export function dateInAdmin(d, admin) {
  if (!admin || admin.k === "all") return true;
  if (!d) return false;
  if (admin.start && d < admin.start) return false;
  if (admin.end && d >= admin.end) return false;
  return true;
}

// Linear-style segmented control used for admin + scope toggles.
export function Segmented({ value, onChange, options, size = "default" }) {
  const h = size === "sm" ? "h-6 text-mini px-2" : "h-7 text-small px-2.5";
  return (
    <div className="inline-flex items-center border border-stroke rounded-md bg-panel overflow-hidden">
      {options.map((o, i) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`${h} transition-colors whitespace-nowrap font-medium ${
            value === o.k ? "bg-accent text-white" : "text-ink_muted hover:bg-muted hover:text-ink"
          } ${i > 0 ? "border-l border-stroke" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

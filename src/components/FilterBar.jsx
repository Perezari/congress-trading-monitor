import React, { useEffect, useRef, useState } from "react";
import { ADMINISTRATIONS, dateInAdmin, findAdmin } from "../ui";

export default function FilterBar({ filters, setFilters, trades }) {
  const options = React.useMemo(() => {
    const parties = new Set();
    const states = new Set();
    for (const t of trades) {
      if (t.party) parties.add(t.party);
      if (t.state) states.add(t.state);
    }
    return {
      parties: [...parties].sort(),
      states: [...states].sort(),
    };
  }, [trades]);

  const set = (k) => (v) => setFilters((prev) => ({ ...prev, [k]: v }));

  // Progressive disclosure: show core filters (search, admin, source, side) always;
  // stash size / late / party / state behind a "More filters" toggle so the bar
  // isn't visually overwhelming when users land on the page.
  const advancedActiveCount =
    (filters.size !== "all" ? 1 : 0) +
    (filters.late !== "all" ? 1 : 0) +
    (filters.party !== "all" ? 1 : 0) +
    (filters.state !== "all" ? 1 : 0);
  const [showAdvanced, setShowAdvanced] = useState(advancedActiveCount > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={filters.search} onChange={set("search")} />
        <Segmented
          options={ADMINISTRATIONS.map((a) => ({ k: a.k, label: a.short }))}
          value={filters.admin || "all"}
          onChange={set("admin")}
        />
        <Segmented
          options={[
            { k: "all", label: "All sources" },
            { k: "house_clerk", label: "House" },
            { k: "senate_efd", label: "Senate" },
            { k: "oge_executive", label: "Exec" },
          ]}
          value={filters.source}
          onChange={set("source")}
        />
        <Segmented
          options={[
            { k: "all", label: "Buy & Sell" },
            { k: "buy", label: "Buy" },
            { k: "sell", label: "Sell" },
          ]}
          value={filters.type}
          onChange={set("type")}
        />
        <button
          onClick={() => setShowAdvanced((o) => !o)}
          className={`h-7 px-2.5 rounded-md border text-small whitespace-nowrap transition-colors ${
            showAdvanced || advancedActiveCount > 0
              ? "bg-accent_bg border-accent_border text-ink"
              : "bg-panel border-stroke text-ink_muted hover:text-ink hover:border-ink_faint"
          }`}
        >
          {showAdvanced ? "Fewer filters" : "More filters"}
          {advancedActiveCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold">
              {advancedActiveCount}
            </span>
          )}
        </button>
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { k: "all", label: "Any size" },
              { k: "small", label: "< $50K" },
              { k: "medium", label: "$50K - $500K" },
              { k: "large", label: "> $500K" },
              { k: "whale", label: "> $5M" },
            ]}
            value={filters.size}
            onChange={set("size")}
          />
          <Segmented
            options={[
              { k: "all", label: "All filings" },
              { k: "on_time", label: "On time" },
              { k: "late", label: "Late" },
            ]}
            value={filters.late}
            onChange={set("late")}
          />
          <Dropdown
            label="Party"
            placeholder="Any party"
            options={[{ k: "all", label: "Any party" }, ...options.parties.map((p) => ({ k: p, label: p }))]}
            value={filters.party}
            onChange={set("party")}
          />
          <Dropdown
            label="State"
            placeholder="Any state"
            options={[{ k: "all", label: "Any state" }, ...options.states.map((s) => ({ k: s, label: s }))]}
            value={filters.state}
            onChange={set("state")}
          />
        </div>
      )}
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter ticker, filer, asset…"
        className="h-7 w-[240px] pl-7 pr-3 text-small bg-panel border border-stroke rounded-md placeholder:text-ink_faint text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
      />
      <svg
        className="absolute left-[8px] top-1/2 -translate-y-1/2 text-ink_faint"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex items-center border border-stroke rounded-md bg-panel overflow-hidden text-small">
      {options.map((o, i) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`px-2.5 h-7 transition-colors whitespace-nowrap ${
            value === o.k ? "bg-accent text-white" : "text-ink_muted hover:bg-muted hover:text-ink"
          } ${i > 0 ? "border-l border-stroke" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Custom dropdown (not native <select>) so visuals match Linear.
function Dropdown({ label, placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.k === value);
  const display = !selected || selected.k === "all" ? placeholder : selected.label;

  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-7 pl-2.5 pr-7 rounded-md border text-small whitespace-nowrap transition-colors ${
          value !== "all"
            ? "bg-accent_bg border-accent_border text-ink"
            : "bg-panel border-stroke text-ink_muted hover:text-ink hover:border-ink_faint"
        }`}
      >
        {display}
        <svg
          className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none text-ink_muted"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M2 4 L5 7 L8 4" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 min-w-[200px] max-h-[280px] overflow-auto bg-panel border border-stroke rounded-md shadow-hover">
          {options.length > 8 && (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full h-8 px-3 text-small bg-transparent border-b border-stroke focus:outline-none"
            />
          )}
          {filtered.map((o) => (
            <button
              key={o.k}
              onClick={() => {
                onChange(o.k);
                setOpen(false);
                setQ("");
              }}
              className={`w-full text-left px-3 py-1.5 text-small flex items-center justify-between ${
                o.k === value ? "bg-muted text-ink" : "text-ink_secondary hover:bg-muted/70"
              }`}
            >
              <span>{o.label}</span>
              {o.k === value && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="text-accent"
                >
                  <path d="M2 5 L4.5 7.5 L8 3" />
                </svg>
              )}
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-small text-ink_muted">No matches</div>}
        </div>
      )}
    </div>
  );
}

export const defaultFilters = {
  search: "",
  admin: "all",
  source: "all",
  type: "all",
  size: "all",
  late: "all",
  party: "all",
  state: "all",
};

export function applyFilters(trades, filters) {
  const admin = findAdmin(filters.admin || "all");
  return trades.filter((t) => {
    if (admin.k !== "all" && !dateInAdmin(t.transaction_date, admin)) return false;
    if (filters.source !== "all" && t.source_id !== filters.source) return false;
    if (filters.party !== "all" && t.party !== filters.party) return false;
    if (filters.state !== "all" && t.state !== filters.state) return false;
    if (filters.type !== "all") {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (filters.type === "buy" && !isBuy) return false;
      if (filters.type === "sell" && !isSell) return false;
    }
    if (filters.size !== "all") {
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
      if (!mid) return false;
      if (filters.size === "small" && !(mid < 50000)) return false;
      if (filters.size === "medium" && !(mid >= 50000 && mid <= 500000)) return false;
      if (filters.size === "large" && !(mid > 500000)) return false;
      if (filters.size === "whale" && !(mid > 5000000)) return false;
    }
    if (filters.late !== "all") {
      const isLate = !!t.is_late;
      if (filters.late === "late" && !isLate) return false;
      if (filters.late === "on_time" && isLate) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !(t.ticker || "").toLowerCase().includes(q) &&
        !(t.asset_name || "").toLowerCase().includes(q) &&
        !(t.filer_name || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

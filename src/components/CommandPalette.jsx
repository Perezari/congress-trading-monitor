import React, { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../router";

function role(f) {
  if (f.branch === "executive") return `Exec · ${f.agency ?? ""}`.trim();
  return `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
}

// Linear-style command palette. Fuzzy-filters filers + tickers.
export default function CommandPalette({ open, onClose, filers = [], tickers = [] }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = [];
    // Always offer tab navigation up top
    const tabs = [
      { type: "page", id: "/", label: "Overview", hint: "Hero + KPIs + scatter" },
      { type: "page", id: "/filers", label: "Filers", hint: "Every politician / official" },
      { type: "page", id: "/tickers", label: "Tickers", hint: "Every stock in the corpus" },
      { type: "page", id: "/trades", label: "Trades", hint: "Filterable transaction table" },
      { type: "page", id: "/about", label: "About", hint: "How the STOCK Act works" },
    ];
    for (const t of tabs) if (!query || t.label.toLowerCase().includes(query)) out.push(t);

    const limit = query ? 30 : 6;
    for (const f of filers) {
      if (!query && out.filter((x) => x.type === "filer").length >= limit) break;
      if (query && out.filter((x) => x.type === "filer").length >= limit) break;
      const name = (f.full_name || "").toLowerCase();
      if (query && !name.includes(query) && !(f.state || "").toLowerCase().includes(query)) continue;
      out.push({
        type: "filer",
        id: `/filer/${f.id}`,
        label: f.full_name,
        hint: role(f),
        right: `${(f.trade_count ?? 0).toLocaleString()} trades`,
      });
    }
    for (const t of tickers) {
      if (!query && out.filter((x) => x.type === "ticker").length >= limit) break;
      if (query && out.filter((x) => x.type === "ticker").length >= limit) break;
      if (query && !(t.ticker || "").toLowerCase().includes(query)) continue;
      out.push({
        type: "ticker",
        id: `/ticker/${t.ticker}`,
        label: t.ticker,
        hint: `${t.trade_count} trades · ${t.filer_count} filers`,
        right: `$${Math.round((t.est_volume || 0) / 1e6)}M`,
      });
    }
    return out;
  }, [q, filers, tickers]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = items[idx];
        if (pick) {
          onClose();
          navigate(pick.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-ink/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-panel border border-stroke rounded-md shadow-hover overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-stroke h-11">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink_muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filers, tickers, or jump to a view…"
            className="flex-1 bg-transparent text-regular placeholder:text-ink_faint text-ink focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-stroke bg-muted font-mono text-mini text-ink_muted">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-auto py-1">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-small text-ink_muted text-center">No matches</div>
          ) : (
            (() => {
              let lastType = null;
              return items.map((it, i) => {
                const showHeader = it.type !== lastType;
                lastType = it.type;
                const label = { page: "Jump to", filer: "Filers", ticker: "Tickers" }[it.type];
                return (
                  <React.Fragment key={`${it.type}-${it.id}`}>
                    {showHeader && <div className="px-3 pt-2 pb-1 text-mini font-medium text-ink_muted">{label}</div>}
                    <button
                      data-idx={i}
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => {
                        onClose();
                        navigate(it.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-[7px] text-small text-left ${
                        idx === i ? "bg-muted text-ink" : "text-ink_secondary hover:bg-muted/60"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-muted text-mini text-ink_muted font-mono">
                        {it.type === "filer" ? "P" : it.type === "ticker" ? "$" : "→"}
                      </span>
                      <span
                        className={`flex-1 ${it.type === "ticker" ? "font-mono font-semibold text-ink" : "font-medium text-ink"}`}
                      >
                        {it.label}
                      </span>
                      <span className="text-mini text-ink_muted truncate max-w-[180px]">{it.hint}</span>
                      {it.right && (
                        <span className="text-mini text-ink_muted tabular-nums min-w-[72px] text-right">
                          {it.right}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>
        <div className="flex items-center gap-3 px-3 h-8 border-t border-stroke text-mini text-ink_muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↑</kbd>
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↓</kbd>
            <span className="ml-1">navigate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↵</kbd>
            <span className="ml-1">open</span>
          </span>
        </div>
      </div>
    </div>
  );
}

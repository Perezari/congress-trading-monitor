import React, { useMemo } from "react";
import { InlineSearchInput, SingleSelectChip, SortButton } from "../components/FilterBar";
import { FilerAvatar, SampleChip } from "../components/TablePrimitives";
import { navigate, useQueryState } from "../router";
import { Card, fmtInt, fmtUSD, SectionHeader, TABLE_HEADER_CLS } from "../ui";

const SORTS = {
  trades: { label: "Most trades", fn: (a, b) => b.trade_count - a.trade_count },
  late: { label: "Most late filings", fn: (a, b) => b.late_filings / b.trade_count - a.late_filings / a.trade_count },
  volume: { label: "Highest volume", fn: (a, b) => (b.est_volume || 0) - (a.est_volume || 0) },
  alpha: { label: "Highest alpha vs SPY", fn: (a, b) => (b.weighted_excess ?? -999) - (a.weighted_excess ?? -999) },
};

const BRANCH_FILTERS = [
  { k: "all", label: "All" },
  { k: "house", label: "House" },
  { k: "senate", label: "Senate" },
  { k: "executive", label: "Executive" },
];

function matchBranch(f, k) {
  if (k === "all") return true;
  if (k === "executive") return f.branch === "executive";
  return f.branch === "congress" && f.chamber === k;
}

export default function FilersPage({ data }) {
  const { filers = [], returns = [] } = data;
  const [qs, setQs] = useQueryState(["q", "sort", "branch"], {
    q: "",
    sort: "trades",
    branch: "all",
  });

  // Merge returns into filers by id for sorting / display
  const enrichedFilers = useMemo(() => {
    const byId = new Map(returns.map((r) => [r.id, r]));
    return filers.map((f) => {
      const r = byId.get(f.id);
      return { ...f, weighted_excess: r?.weighted_excess ?? null, scored_buys: r?.scored_buys ?? 0 };
    });
  }, [filers, returns]);

  const filtered = useMemo(() => {
    const q = qs.q.toLowerCase().trim();
    let list = enrichedFilers.filter((f) => {
      if (!matchBranch(f, qs.branch)) return false;
      if (!q) return true;
      return (
        (f.full_name || "").toLowerCase().includes(q) ||
        (f.state || "").toLowerCase().includes(q) ||
        (f.agency || "").toLowerCase().includes(q)
      );
    });
    const sorter = SORTS[qs.sort] ?? SORTS.trades;
    return [...list].sort(sorter.fn);
  }, [enrichedFilers, qs]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="Filers"
        subtitle={`${fmtInt(filtered.length)} of ${fmtInt(enrichedFilers.length)}`}
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <InlineSearchInput
          value={qs.q}
          onChange={(v) => setQs({ q: v })}
          placeholder="Search name, state, agency…"
          width={240}
        />
        <SingleSelectChip
          label="Chamber"
          options={BRANCH_FILTERS}
          value={qs.branch}
          onChange={(v) => setQs({ branch: v })}
        />
        <SortButton
          options={Object.entries(SORTS).map(([k, s]) => ({ k, label: s.label }))}
          value={qs.sort}
          onChange={(v) => setQs({ sort: v })}
        />
      </div>

      <FilersTable
        filtered={filtered}
        sort={qs.sort}
        onClear={() => setQs({ q: "", sort: "trades", branch: "all" })}
      />
    </div>
  );
}

// Columns: rank · avatar+name · trades · buy/sell split · volume · (late | alpha vs SPY)
// The last column swaps between Late share and vs SPY depending on the active sort —
// it'd be silly to sort by Late and not show the column users are sorting against.
const GRID = "32px minmax(200px,1.8fr) 86px 108px 136px 168px";

function FilersTable({ filtered, sort, onClear }) {
  const showLate = sort === "late";

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
      <div className="min-w-[820px]">
      <div
        className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
        style={{ gridTemplateColumns: GRID }}
      >
        <span className="text-right">#</span>
        <span>Filer</span>
        <span className="tabular-nums text-right">Trades</span>
        <span className="tabular-nums text-right">Buy / Sell mix</span>
        <span className="tabular-nums text-right">Est. volume</span>
        <span className="tabular-nums text-right">{showLate ? "Late share" : "vs SPY"}</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-small text-ink_muted text-center">
            No filers match these filters.{" "}
            <button onClick={onClear} className="text-accent hover:underline">
              Clear filters
            </button>
            .
          </div>
        )}
        {filtered.slice(0, 500).map((f, i) => {
          const alpha = f.weighted_excess;
          return (
            <button
              key={f.id}
              onClick={() => navigate(`/filer/${f.id}`)}
              className="w-full grid gap-3 px-4 py-[10px] items-center text-left even:bg-[lch(95.5%_0_282)] hover:bg-muted/70"
              style={{ gridTemplateColumns: GRID }}
            >
              <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>

              <div className="flex items-center gap-2.5 min-w-0">
                <FilerAvatar filer={f} size={32} />
                <div className="min-w-0">
                  <div className="text-small text-ink font-medium truncate">{f.full_name}</div>
                  <div className="text-mini text-ink_muted truncate mt-[1px]">
                    {f.branch === "executive"
                      ? `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "Executive"
                      : `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`}
                  </div>
                </div>
              </div>

              <span className="tabular-nums text-right text-small text-ink">{f.trade_count.toLocaleString()}</span>

              <span className="text-mini text-ink_muted tabular-nums text-right whitespace-nowrap">
                <span className="text-buy">{f.purchases || 0}</span>
                <span className="text-ink_faint mx-[2px]">/</span>
                <span className="text-sell">{f.sales || 0}</span>
              </span>

              <span className="tabular-nums text-right text-small text-ink_muted">
                {f.est_volume ? fmtUSD(f.est_volume) : "—"}
              </span>

              {showLate ? (
                <div className="flex items-center justify-end gap-2 tabular-nums">
                  {f.late_filings > 0 ? (
                    <>
                      <span
                        className={`text-small font-semibold tabular-nums ${
                          f.late_filings / f.trade_count >= 0.5 ? "text-warn" : "text-ink_muted"
                        }`}
                      >
                        {((f.late_filings / f.trade_count) * 100).toFixed(0)}%
                      </span>
                      <span className="text-mini text-ink_faint tabular-nums whitespace-nowrap min-w-[34px] text-right">
                        {f.late_filings}
                      </span>
                    </>
                  ) : (
                    <span className="text-small text-ink_faint">—</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 tabular-nums">
                  {alpha == null ? (
                    <span className="text-small text-ink_faint">—</span>
                  ) : (
                    <>
                      <span
                        className={`text-small font-semibold tabular-nums ${alpha >= 0 ? "text-buy" : "text-sell"}`}
                      >
                        {alpha >= 0 ? "+" : ""}
                        {alpha.toFixed(1)}%
                      </span>
                      <SampleChip n={f.scored_buys} />
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      </div>
      </div>
      {filtered.length > 500 && (
        <div className="px-4 py-2 border-t border-stroke text-mini text-ink_muted text-center">
          Showing 500 of {filtered.length.toLocaleString()} filers. Narrow the search to see the rest.
        </div>
      )}
    </Card>
  );
}

function Segmented({ value, onChange, options }) {
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

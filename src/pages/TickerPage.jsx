import React, { useEffect, useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import PersonalTimeline from "../components/PersonalTimeline";
import { FilerAvatar } from "../components/TablePrimitives";
import { TickerBadge } from "../components/TickerBadge";
import { navigate } from "../router";
import TradesTable from "../TradesTable";
import { Card, fmtInt, fmtUSD, Link, SectionHeader } from "../ui";

export default function TickerPage({ symbol, filersById }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/data/ticker/${encodeURIComponent(symbol)}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(setError);
  }, [symbol]);

  const trades = data?.trades ?? [];
  const ticker = data?.ticker ?? symbol;
  const price = data?.price ?? null;

  const stats = useMemo(() => {
    let buys = 0,
      sells = 0,
      late = 0,
      vol = 0,
      excessSum = 0,
      excessCount = 0;
    const byFiler = new Map();
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (isBuy) buys++;
      else if (isSell) sells++;
      if (t.is_late) late++;
      if (t.amount_range_low && t.amount_range_high) vol += (t.amount_range_low + t.amount_range_high) / 2;
      if (t.excess_since != null) {
        excessSum += t.excess_since;
        excessCount++;
      }
      if (!byFiler.has(t.filer_id))
        byFiler.set(t.filer_id, {
          id: t.filer_id,
          name: t.filer_name,
          chamber: t.chamber,
          branch: t.branch,
          party: t.party,
          count: 0,
          buys: 0,
          sells: 0,
          vol: 0,
        });
      const f = byFiler.get(t.filer_id);
      f.count++;
      if (isBuy) f.buys++;
      else if (isSell) f.sells++;
      if (t.amount_range_low && t.amount_range_high) f.vol += (t.amount_range_low + t.amount_range_high) / 2;
    }
    const avgExcess = excessCount > 0 ? excessSum / excessCount : null;
    const topFilers = [...byFiler.values()].sort((a, b) => b.count - a.count).slice(0, 12);
    return {
      buys,
      sells,
      late,
      vol,
      count: trades.length,
      filerCount: byFiler.size,
      topFilers,
      avgExcess,
      scored: excessCount,
    };
  }, [trades]);

  const filtered = useMemo(() => applyFilters(trades, filters), [trades, filters]);

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
        <div className="text-small text-ink_muted">
          No trades found for <span className="font-mono text-ink">{symbol}</span>.
        </div>
        <Link to="/" className="text-small mt-3 inline-block">
          ← Back to all trades
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 text-ink_muted text-small">Loading…</div>;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <nav className="text-small text-ink_muted mb-4 flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="no-underline hover:text-ink hover:no-underline">
          Overview
        </Link>
        <span className="text-ink_faint">›</span>
        <Link to="/tickers" className="no-underline hover:text-ink hover:no-underline">
          Tickers
        </Link>
        <span className="text-ink_faint">›</span>
        <span className="text-ink font-semibold">{ticker}</span>
      </nav>

      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <TickerBadge ticker={ticker} size="lg" />
          <span className="text-regular text-ink_muted">
            traded by <span className="text-ink font-medium">{stats.filerCount}</span> filers,{" "}
            <span className="text-ink font-medium">{fmtInt(stats.count)}</span> times
          </span>
        </div>
        {price && <PriceTicker price={price} />}
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-stroke md:divide-y-0 divide-y">
          <Stat label="Trades" value={fmtInt(stats.count)} />
          <Stat label="Buys" value={fmtInt(stats.buys)} className="text-buy" />
          <Stat label="Sells" value={fmtInt(stats.sells)} className="text-sell" />
          <Stat label="Est. volume" value={fmtUSD(stats.vol)} />
          <Stat label="Late" value={`${fmtInt(stats.late)}`} />
          {stats.avgExcess != null && (
            <Stat
              label="Avg cumulative vs SPY"
              value={`${stats.avgExcess >= 0 ? "+" : ""}${stats.avgExcess.toFixed(0)}%`}
              className={stats.avgExcess >= 0 ? "text-buy" : "text-sell"}
              sub={`${stats.scored} scored buys, trade-date to today`}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 mb-8">
        <div className="min-w-0">
          <SectionHeader title="Trade timeline" />
          <Card className="p-4">
            <PersonalTimeline trades={trades} highlightTicker={ticker} />
          </Card>
        </div>
        <div className="min-w-0">
          <SectionHeader title="Top holders" />
          <Card className="overflow-hidden">
            <div className="divide-y divide-stroke_soft">
              {stats.topFilers.map((f) => {
                const lookup = filersById?.get?.(f.id) ?? { full_name: f.name, chamber: f.chamber, branch: f.branch };
                return (
                  <div
                    key={f.id}
                    className="px-4 py-[8px] flex items-center gap-2.5 hover:bg-muted cursor-pointer"
                    onClick={() => navigate(`/filer/${f.id}`)}
                  >
                    <FilerAvatar filer={lookup} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="text-small font-medium text-ink truncate">{f.name}</div>
                      <div className="text-mini text-ink_muted tabular-nums whitespace-nowrap mt-[2px]">
                        {f.count} · {fmtUSD(f.vol)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <SectionHeader title="All trades" subtitle={`${fmtInt(filtered.length)} of ${fmtInt(trades.length)}`} />
      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} trades={trades} />
      </div>
      <TradesTable trades={filtered} tall filersById={filersById} />
    </div>
  );
}

function Stat({ label, value, className = "", sub }) {
  return (
    <div className="px-5 py-4 flex-1 min-w-0">
      <div className="text-small font-medium text-ink_muted">{label}</div>
      <div
        className={`mt-2 text-[1.5rem] font-semibold leading-none tabular-nums tracking-[-0.012em] ${className || "text-ink"}`}
      >
        {value}
      </div>
      {sub && <div className="text-mini text-ink_muted mt-2">{sub}</div>}
    </div>
  );
}

function PriceTicker({ price }) {
  const last = price.latest?.close ?? null;
  const prev = price.previous?.close ?? null;
  const change = last != null && prev != null ? ((last - prev) / prev) * 100 : null;
  const tone = change == null ? "text-ink_muted" : change >= 0 ? "text-buy" : "text-sell";
  return (
    <div className="text-right">
      <div className="text-small text-ink_muted">
        Last close <span className="font-mono text-ink_muted">{price.latest?.date ?? "—"}</span>
      </div>
      <div className="flex items-baseline gap-2 justify-end">
        <span className="text-[1.25rem] font-semibold tabular-nums text-ink">
          ${last != null ? last.toFixed(2) : "—"}
        </span>
        <span className={`text-small font-semibold tabular-nums ${tone}`}>
          {change == null ? "" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );
}

import React, { useMemo } from "react";
import { TickerBadge, TickerLabel } from "../components/TickerBadge";
import { navigate, useQueryState } from "../router";
import { Card, fmtInt, fmtUSD, SectionHeader, Segmented, TABLE_HEADER_CLS } from "../ui";

const SORTS = {
  trades: { label: "Most trades", fn: (a, b) => b.trade_count - a.trade_count },
  filers: { label: "Most filers", fn: (a, b) => b.filer_count - a.filer_count },
  volume: { label: "Highest volume", fn: (a, b) => (b.est_volume || 0) - (a.est_volume || 0) },
  buys: { label: "Net buys", fn: (a, b) => b.purchases - b.sales - (a.purchases - a.sales) },
};

const GRID = "28px 72px 80px 130px 72px minmax(140px,1fr) 120px";

function dailyChange(p) {
  if (!p?.latest || !p?.previous) return null;
  const a = p.latest.close;
  const b = p.previous.close;
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

export default function TickersPage({ data }) {
  const { tickers = [], prices = {} } = data;
  const [qs, setQs] = useQueryState(["q", "sort"], { q: "", sort: "trades" });

  const filtered = useMemo(() => {
    const q = qs.q.toLowerCase().trim();
    const list = q ? tickers.filter((t) => (t.ticker || "").toLowerCase().includes(q)) : tickers;
    const sorter = SORTS[qs.sort] ?? SORTS.trades;
    return [...list].sort(sorter.fn);
  }, [tickers, qs]);

  const mostWidelyHeld = useMemo(
    () => [...tickers].sort((a, b) => b.filer_count - a.filer_count).slice(0, 6),
    [tickers],
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="Tickers"
        subtitle={`${fmtInt(filtered.length)} of ${fmtInt(tickers.length)}`}
        right={
          <input
            type="text"
            value={qs.q}
            onChange={(e) => setQs({ q: e.target.value })}
            placeholder="Filter ticker…"
            className="h-8 w-[200px] pl-3 pr-3 text-small bg-panel border border-stroke rounded-md placeholder:text-ink_faint text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40 font-mono"
          />
        }
      />

      {mostWidelyHeld.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-small text-ink_muted mr-1">Most widely held</span>
          {mostWidelyHeld.map((t) => {
            const change = dailyChange(prices[t.ticker]);
            return (
              <button
                key={t.ticker}
                onClick={() => navigate(`/ticker/${t.ticker}`)}
                className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-stroke bg-panel hover:border-ink_faint hover:bg-muted transition-colors"
              >
                <TickerBadge ticker={t.ticker} size="sm" />
                {change != null && (
                  <span className={`text-mini tabular-nums ${change >= 0 ? "text-buy" : "text-sell"}`}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                )}
                <span className="text-mini text-ink_faint tabular-nums">· {t.filer_count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <Segmented
          value={qs.sort}
          onChange={(v) => setQs({ sort: v })}
          options={Object.entries(SORTS).map(([k, s]) => ({ k, label: s.label }))}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[880px]">
        <div
          className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
          style={{ gridTemplateColumns: GRID }}
        >
          <span className="text-right">#</span>
          <span>Ticker</span>
          <span className="tabular-nums text-right">Trades</span>
          <span className="tabular-nums text-right">Last · Δ1d</span>
          <span className="tabular-nums text-right">Filers</span>
          <span className="tabular-nums text-right">Buy / Sell mix</span>
          <span className="tabular-nums text-right">Est. volume</span>
        </div>
        <div className="divide-y divide-stroke_soft">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-small text-ink_muted text-center">
              No tickers match.{" "}
              <button onClick={() => setQs({ q: "", sort: "trades" })} className="text-accent hover:underline">
                Clear filters
              </button>
              .
            </div>
          )}
          {filtered.slice(0, 1000).map((t, i) => {
            const p = prices[t.ticker];
            const change = dailyChange(p);
            return (
              <button
                key={t.ticker}
                onClick={() => navigate(`/ticker/${t.ticker}`)}
                className="w-full grid gap-3 px-4 py-[10px] items-center text-left even:bg-[lch(95.5%_0_282)] hover:bg-muted/70"
                style={{ gridTemplateColumns: GRID }}
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>

                <TickerLabel ticker={t.ticker} size="sm" />

                <span className="tabular-nums text-right text-small text-ink">{t.trade_count.toLocaleString()}</span>

                <div className="text-right tabular-nums">
                  {p?.latest?.close != null ? (
                    <>
                      <span className="text-small text-ink font-mono">${p.latest.close.toFixed(2)}</span>
                      {change != null && (
                        <span className={`text-mini ml-1 ${change >= 0 ? "text-buy" : "text-sell"}`}>
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-small text-ink_faint">—</span>
                  )}
                </div>

                <span className="tabular-nums text-right text-small text-ink_muted">{t.filer_count}</span>

                <span className="text-mini tabular-nums text-right whitespace-nowrap">
                  <span className="text-buy">{t.purchases}</span>
                  <span className="text-ink_faint mx-[2px]">/</span>
                  <span className="text-sell">{t.sales}</span>
                </span>

                <span className="tabular-nums text-right text-small text-ink_muted">{fmtUSD(t.est_volume)}</span>
              </button>
            );
          })}
        </div>
        </div>
        </div>
        {filtered.length > 1000 && (
          <div className="px-4 py-2 border-t border-stroke text-mini text-ink_muted text-center">
            Showing 1,000 of {fmtInt(filtered.length)} tickers. Narrow the search to see the rest.
          </div>
        )}
      </Card>
    </div>
  );
}

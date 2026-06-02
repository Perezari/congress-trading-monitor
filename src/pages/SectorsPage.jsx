import React, { useMemo } from "react";
import { TickerBadge } from "../components/TickerBadge";
import { useQueryState } from "../router";
import { Card, fmtInt, fmtUSD, RowLink, SectionHeader, SortHeader, TABLE_HEADER_CLS } from "../ui";
import { SECTORS, SECTOR_COLOR, sectorOf } from "../sectors";

const SORTS = {
  volume: { label: "Highest volume", fn: (a, b) => b.est_volume - a.est_volume },
  trades: { label: "Most trades", fn: (a, b) => b.trade_count - a.trade_count },
  buys: { label: "Net buys", fn: (a, b) => b.purchases - b.sales - (a.purchases - a.sales) },
  tickers: { label: "Most tickers", fn: (a, b) => b.ticker_count - a.ticker_count },
};

const GRID = "28px minmax(150px,1fr) 90px 110px 70px 130px";

export default function SectorsPage({ data }) {
  const { tickers = [] } = data;
  const [qs, setQs] = useQueryState(["sort"], { sort: "volume" });

  // Aggregate the per-ticker rows (full-history volume/trades/buys/sells) by the
  // issuer's sector. tickers.json — not trades.json — because the latter is only
  // the recent 5k subset, while these aggregates span the full dataset.
  const { rows, totalVolume, maxVolume } = useMemo(() => {
    const agg = new Map();
    for (const s of SECTORS) {
      agg.set(s.key, {
        key: s.key,
        label: s.label,
        est_volume: 0,
        trade_count: 0,
        purchases: 0,
        sales: 0,
        ticker_count: 0,
        top: [],
      });
    }
    for (const t of tickers) {
      const a = agg.get(sectorOf(t.ticker));
      a.est_volume += t.est_volume || 0;
      a.trade_count += t.trade_count || 0;
      a.purchases += t.purchases || 0;
      a.sales += t.sales || 0;
      a.ticker_count += 1;
      a.top.push(t);
    }
    const rows = [...agg.values()].filter((a) => a.trade_count > 0);
    for (const a of rows) {
      a.top = a.top.sort((x, y) => (y.est_volume || 0) - (x.est_volume || 0)).slice(0, 4);
    }
    const totalVolume = rows.reduce((s, a) => s + a.est_volume, 0);
    const maxVolume = Math.max(1, ...rows.map((a) => a.est_volume));
    return { rows, totalVolume, maxVolume };
  }, [tickers]);

  const sorted = useMemo(() => {
    const sorter = SORTS[qs.sort] ?? SORTS.volume;
    return [...rows].sort(sorter.fn);
  }, [rows, qs.sort]);

  const Bar = ({ s }) => (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${(s.est_volume / maxVolume) * 100}%`, backgroundColor: SECTOR_COLOR[s.key] }}
      />
    </div>
  );

  const Dot = ({ s }) => (
    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SECTOR_COLOR[s.key] }} />
  );

  const Tickers = ({ s }) => (
    <div className="flex items-center gap-1">
      {s.top.map((t) => (
        <RowLink key={t.ticker} to={`/ticker/${t.ticker}`} className="no-underline">
          <TickerBadge ticker={t.ticker} size="sm" />
        </RowLink>
      ))}
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="Sectors"
        subtitle={`Where the money flows · ${fmtUSD(totalVolume)} across ${rows.length} sectors`}
      />
      <p className="text-mini text-ink_muted mb-4 max-w-2xl">
        Disclosed volume grouped by the issuer's sector, from a curated map covering the
        highest-volume tickers (~90% of notional). The long tail falls under “Other”.
      </p>

      <Card className="overflow-hidden">
        {/* Mobile: stacked cards. */}
        <div className="lg:hidden divide-y divide-stroke_soft">
          {sorted.map((s, i) => {
            const share = totalVolume ? (s.est_volume / totalVolume) * 100 : 0;
            return (
              <div key={s.key} className="px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-mini text-ink_faint tabular-nums w-5 text-right">{i + 1}</span>
                    <Dot s={s} />
                    <span className="text-small font-medium text-ink truncate">{s.label}</span>
                  </div>
                  <span className="text-small tabular-nums text-ink font-medium shrink-0">{fmtUSD(s.est_volume)}</span>
                </div>
                <div className="mt-2">
                  <Bar s={s} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-mini tabular-nums text-ink_muted">
                  <span>
                    {fmtInt(s.trade_count)} trades · {s.ticker_count} tickers · {share.toFixed(1)}%
                  </span>
                  <span>
                    <span className="text-buy">{fmtInt(s.purchases)}</span>
                    <span className="text-ink_faint mx-1">/</span>
                    <span className="text-sell">{fmtInt(s.sales)}</span>
                  </span>
                </div>
                <div className="mt-2">
                  <Tickers s={s} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: grid table. */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[860px]">
            <div
              className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
              style={{ gridTemplateColumns: GRID }}
            >
              <span className="text-right">#</span>
              <span>Sector</span>
              <SortHeader label="Trades" sortKey="trades" sort={qs.sort} setSort={(v) => setQs({ sort: v })} align="right" />
              <SortHeader label="Buy / Sell" sortKey="buys" sort={qs.sort} setSort={(v) => setQs({ sort: v })} align="right" />
              <SortHeader label="Tickers" sortKey="tickers" sort={qs.sort} setSort={(v) => setQs({ sort: v })} align="right" />
              <SortHeader label="Est. volume" sortKey="volume" sort={qs.sort} setSort={(v) => setQs({ sort: v })} align="right" />
            </div>
            <div className="divide-y divide-stroke_soft">
              {sorted.map((s, i) => {
                const share = totalVolume ? (s.est_volume / totalVolume) * 100 : 0;
                return (
                  <div
                    key={s.key}
                    className="grid gap-3 px-4 py-[10px] items-center text-small even:bg-[lch(95.5%_0_282)]"
                    style={{ gridTemplateColumns: GRID }}
                  >
                    <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Dot s={s} />
                        <span className="font-medium text-ink truncate">{s.label}</span>
                        <span className="text-mini text-ink_faint tabular-nums">{share.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex-1 max-w-[240px]">
                          <Bar s={s} />
                        </div>
                        <Tickers s={s} />
                      </div>
                    </div>
                    <span className="tabular-nums text-right text-ink">{fmtInt(s.trade_count)}</span>
                    <span className="text-mini tabular-nums text-right whitespace-nowrap">
                      <span className="text-buy">{fmtInt(s.purchases)}</span>
                      <span className="text-ink_faint mx-[2px]">/</span>
                      <span className="text-sell">{fmtInt(s.sales)}</span>
                    </span>
                    <span className="tabular-nums text-right text-ink_muted">{s.ticker_count}</span>
                    <span className="tabular-nums text-right text-ink_muted">{fmtUSD(s.est_volume)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

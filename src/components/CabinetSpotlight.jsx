import React, { useMemo } from "react";
import { dateInAdmin, findAdmin, fmtInt, fmtUSD, Link, RowLink, SectionHeader, TABLE_HEADER_CLS } from "../ui";
import { FilerAvatar } from "./TablePrimitives";

// Trump II cabinet spotlight. Surfaces executive-branch officials with any
// disclosed activity since the 2025 inauguration. Ordered by est. volume,
// which is more telling than raw trade counts for senior officials who may
// trade large one-off positions rather than many small ones.
//
// Inspired by open-cabinet.org's "What is Trump's cabinet buying?" hero block.
export default function CabinetSpotlight({ filers, trades }) {
  const admin = findAdmin("trump2");

  const spotlight = useMemo(() => {
    const byFiler = new Map();
    let totalTrades = 0,
      totalLate = 0,
      totalVol = 0;
    const tickerCount = new Map();
    for (const t of trades) {
      if (!dateInAdmin(t.transaction_date, admin)) continue;
      const fid = t.filer_id;
      if (!fid) continue;
      const filer = filers.find((f) => f.id === fid);
      if (!filer || filer.branch !== "executive") continue;
      if (!byFiler.has(fid)) {
        byFiler.set(fid, {
          id: fid,
          name: t.filer_name,
          agency: filer.agency,
          level: filer.level,
          photo_url: filer.photo_url,
          branch: filer.branch,
          trades: 0,
          buys: 0,
          sells: 0,
          volume: 0,
          late: 0,
          latest: null,
        });
      }
      const e = byFiler.get(fid);
      e.trades++;
      totalTrades++;
      const tt = (t.transaction_type || "").toLowerCase();
      if (tt.includes("urchase") || tt === "p") e.buys++;
      else if (tt.includes("ale") || tt === "s") e.sells++;
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : 0;
      e.volume += mid;
      totalVol += mid;
      if (t.is_late) {
        e.late++;
        totalLate++;
      }
      if (!e.latest || (t.filing_date && t.filing_date > e.latest)) e.latest = t.filing_date;
      if (t.ticker) tickerCount.set(t.ticker, (tickerCount.get(t.ticker) || 0) + 1);
    }
    const officials = [...byFiler.values()].sort((a, b) => b.volume - a.volume);
    const topTickers = [...tickerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { officials, totalTrades, totalLate, totalVol, topTickers };
  }, [filers, trades, admin]);

  if (spotlight.officials.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="Cabinet activity"
        subtitle={`${fmtInt(spotlight.officials.length)} officials · ${fmtInt(spotlight.totalTrades)} trades · ${fmtUSD(spotlight.totalVol)} since 2025-01-20`}
        right={
          <Link to="/filers?admin=trump2&branch=executive" className="text-small no-underline hover:no-underline">
            See all →
          </Link>
        }
      />
      <div className="border border-stroke rounded-md bg-panel overflow-hidden">
        {/* Mobile/tablet: stacked rows with zebra. */}
        <div className="lg:hidden divide-y divide-stroke_soft">
          {spotlight.officials.slice(0, 10).map((o, i) => {
            const netBias = o.trades ? ((o.buys - o.sells) / o.trades) * 100 : 0;
            return (
              <RowLink
                key={o.id}
                to={`/filer/${o.id}`}
                className="block w-full px-3 py-3 text-left text-ink no-underline even:bg-[lch(95.5%_0_282)] hover:bg-muted/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-mini text-ink_faint tabular-nums w-5 shrink-0 text-right">{i + 1}</span>
                    <FilerAvatar filer={o} size={28} />
                    <div className="min-w-0">
                      <div className="text-small text-ink font-medium truncate">{o.name}</div>
                      <div className="text-mini text-ink_muted truncate mt-[1px]">
                        {o.level || "Official"}
                        {o.agency ? ` · ${o.agency}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-small text-ink font-medium">{fmtUSD(o.volume)}</div>
                    <div className="text-mini text-ink_muted mt-[1px]">{fmtInt(o.trades)} trades</div>
                  </div>
                </div>
                <div className="mt-1.5 ml-7 flex items-center gap-2 text-mini tabular-nums text-ink_muted">
                  <span>
                    <span className="text-buy">{o.buys}</span>
                    <span className="text-ink_faint mx-[2px]">/</span>
                    <span className="text-sell">{o.sells}</span>
                  </span>
                  <span className={netBias > 20 ? "text-buy" : netBias < -20 ? "text-sell" : "text-ink_faint"}>
                    {netBias > 20 ? "buy bias" : netBias < -20 ? "sell bias" : "balanced"}
                  </span>
                </div>
              </RowLink>
            );
          })}
        </div>
        {/* Desktop: full grid table. */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[720px]">
            <div
              className={`grid grid-cols-[32px_minmax(0,1.3fr)_minmax(0,1fr)_70px_136px_110px] gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
            >
              <span className="text-right">#</span>
              <span>Official</span>
              <span>Agency</span>
              <span className="tabular-nums text-right">Trades</span>
              <span className="tabular-nums text-right">Buy / Sell · bias</span>
              <span className="tabular-nums text-right">Est. volume</span>
            </div>
            <div className="divide-y divide-stroke_soft">
              {spotlight.officials.slice(0, 10).map((o, i) => {
                const netBias = o.trades ? ((o.buys - o.sells) / o.trades) * 100 : 0;
                const biasArrow = netBias > 20 ? "↑" : netBias < -20 ? "↓" : "•";
                const biasTone = netBias > 20 ? "text-buy" : netBias < -20 ? "text-sell" : "text-ink_faint";
                return (
                  <RowLink
                    key={o.id}
                    to={`/filer/${o.id}`}
                    className="w-full grid grid-cols-[32px_minmax(0,1.3fr)_minmax(0,1fr)_70px_136px_110px] gap-3 px-4 py-[10px] items-center text-left text-small text-ink no-underline hover:bg-muted/70"
                  >
                    <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FilerAvatar filer={o} size={28} />
                      <div className="min-w-0">
                        <div className="text-ink font-medium truncate">{o.name}</div>
                        <div className="text-mini text-ink_muted truncate">{o.level || "Official"}</div>
                      </div>
                    </div>
                    <span className="text-ink_muted truncate">{o.agency || "—"}</span>
                    <span className="tabular-nums text-right text-ink">{fmtInt(o.trades)}</span>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-mini tabular-nums whitespace-nowrap">
                        <span className="text-buy">{o.buys}</span>
                        <span className="text-ink_faint mx-[2px]">/</span>
                        <span className="text-sell">{o.sells}</span>
                      </span>
                      <span
                        className={`text-small tabular-nums w-[12px] text-center ${biasTone}`}
                        title={`Net bias ${netBias.toFixed(0)}%`}
                      >
                        {biasArrow}
                      </span>
                    </div>
                    <span className="tabular-nums text-right text-ink_muted">{fmtUSD(o.volume)}</span>
                  </RowLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

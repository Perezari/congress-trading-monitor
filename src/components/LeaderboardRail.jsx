import React, { useMemo } from "react";
import { navigate } from "../router";
import { dateInAdmin, findAdmin, fmtInt, fmtUSD } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// A fun "podium" rail that answers the 5 questions most readers want
// immediately: who's trading most, who's earning most, hot stocks,
// best hit rate, biggest single trade. Each card links to the detail
// page for the winner. Respects the current admin scope.

function Card({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[150px] sm:min-w-[180px] text-left p-3 sm:p-3.5 rounded-md border border-stroke bg-panel hover:border-ink_faint hover:shadow-card transition-all ${className}`}
    >
      {children}
    </button>
  );
}

function Metric({ label }) {
  return (
    <div className="mb-2">
      <span className="text-mini  text-ink_muted font-medium">{label}</span>
    </div>
  );
}

export default function LeaderboardRail({
  filers = [],
  returns = [],
  tickers = [],
  trades = [],
  prices = {},
  adminKey = "all",
  adminStat = null,
}) {
  const admin = findAdmin(adminKey);
  const adminActive = admin.k !== "all";

  const data = useMemo(() => {
    // When admin is scoped we use server-pre-aggregated `adminStat.topByTrades`
    // (otherwise the browser's 5k-row trades.json misses pre-2024 windows).
    const scopedTrades = adminActive ? trades.filter((t) => dateInAdmin(t.transaction_date, admin)) : trades;

    // Most active: prefer adminStat's top row (pre-aggregated server-side)
    let mostActive = null;
    if (adminActive && adminStat?.topByTrades?.[0]) {
      const top = adminStat.topByTrades[0];
      mostActive = { ...top, metric: top.trade_count };
    } else if (!adminActive) {
      const top = [...filers].sort((a, b) => b.trade_count - a.trade_count)[0];
      if (top) mostActive = { ...top, metric: top.trade_count };
    }

    // Highest alpha: top of returns.json (pre-aggregated with min-sample threshold).
    // returns.json is always all-time; skip if admin is scoped since we'd need
    // a different calculation.
    let highestAlpha = null;
    if (!adminActive) {
      const top = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess)[0];
      if (top) {
        const f = filers.find((x) => x.id === top.id) || top;
        highestAlpha = { ...f, metric: top.weighted_excess, scored_buys: top.scored_buys };
      }
    }

    // Hottest stock: in scoped mode use the server-pre-aggregated #1 top ticker
    // (since trades.json is capped at 5k recent rows). "Hot" means most-traded
    // in the admin window.
    let hottestStock = null;
    if (adminActive && adminStat?.topTickers?.[0]) {
      const top = adminStat.topTickers[0];
      const p = prices[top.ticker];
      const change = p?.latest && p?.previous ? ((p.latest.close - p.previous.close) / p.previous.close) * 100 : null;
      hottestStock = { ticker: top.ticker, trades: top.trade_count, change };
    } else if (!adminActive) {
      // 60 days is wide enough to avoid noisy single-trade winners; combined
      // with a minimum of 5 trades this stops a random obscure ticker from
      // claiming the "hot stock" slot on a quiet week.
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const recent = new Map();
      for (const t of scopedTrades) {
        if (!t.ticker || !t.transaction_date) continue;
        if (t.transaction_date < cutoffStr) continue;
        recent.set(t.ticker, (recent.get(t.ticker) || 0) + 1);
      }
      let bestTicker = null,
        bestScore = 0;
      for (const [tk, n] of recent) {
        if (n >= 5 && n > bestScore) {
          bestScore = n;
          bestTicker = tk;
        }
      }
      if (bestTicker) {
        const p = prices[bestTicker];
        const change = p?.latest && p?.previous ? ((p.latest.close - p.previous.close) / p.previous.close) * 100 : null;
        hottestStock = { ticker: bestTicker, trades: bestScore, change, window: "60d" };
      }
    }

    // Best hit rate: filer with >=20 scored buys and highest % of buys beating SPY.
    // Compute from all-time data for statistical significance.
    let bestHitRate = null;
    if (!adminActive) {
      const byFiler = new Map();
      for (const t of trades) {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        if (!isBuy) continue;
        if (t.excess_since == null) continue;
        if (!t.filer_id) continue;
        if (!byFiler.has(t.filer_id)) byFiler.set(t.filer_id, { scored: 0, wins: 0 });
        const e = byFiler.get(t.filer_id);
        e.scored++;
        if (t.excess_since > 0) e.wins++;
      }
      let best = null,
        bestRate = 0;
      for (const [id, stats] of byFiler) {
        if (stats.scored < 20) continue;
        const rate = stats.wins / stats.scored;
        if (rate > bestRate) {
          bestRate = rate;
          best = { id, ...stats, rate };
        }
      }
      if (best) {
        const f = filers.find((x) => x.id === best.id);
        if (f) bestHitRate = { ...f, metric: best.rate, scored: best.scored, wins: best.wins };
      }
    }

    // Biggest single trade: pre-aggregated server-side for scoped admins;
    // otherwise scan the client-side trades slice.
    let biggestTrade = null;
    if (adminActive && adminStat?.biggestTrade) {
      const b = adminStat.biggestTrade;
      const f = filers.find((x) => x.id === b.filer_id);
      biggestTrade = {
        filer: f,
        filer_name: b.filer_name,
        ticker: b.ticker,
        asset_name: b.asset_name,
        mid: b.mid,
        date: b.transaction_date,
      };
    } else if (!adminActive) {
      let best = null,
        bestMid = 0;
      for (const t of scopedTrades) {
        if (!t.amount_range_low || !t.amount_range_high) continue;
        const mid = (t.amount_range_low + t.amount_range_high) / 2;
        if (mid > bestMid) {
          bestMid = mid;
          best = t;
        }
      }
      if (best) {
        const f = filers.find((x) => x.id === best.filer_id);
        biggestTrade = {
          filer: f,
          filer_name: best.filer_name,
          ticker: best.ticker,
          asset_name: best.asset_name,
          mid: bestMid,
          date: best.transaction_date,
        };
      }
    }

    return { mostActive, highestAlpha, hottestStock, bestHitRate, biggestTrade };
  }, [filers, returns, tickers, trades, prices, adminKey, adminActive, admin, adminStat]);

  return (
    <div className="flex gap-3 flex-wrap">
      {/* Most active */}
      {data.mostActive && (
        <Card onClick={() => navigate(`/filer/${data.mostActive.id}`)}>
          <Metric label="Most active" />
          <div className="flex items-center gap-2.5">
            <FilerAvatar filer={data.mostActive} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-medium text-ink truncate">{data.mostActive.full_name}</div>
              <div className="text-mini text-ink_muted tabular-nums">
                {fmtInt(data.mostActive.metric)} trades{" "}
                {adminActive && <span className="text-ink_faint">· {admin.short}</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Biggest outperformer */}
      {data.highestAlpha && (
        <Card onClick={() => navigate(`/filer/${data.highestAlpha.id}`)}>
          <Metric label="Biggest outperformer" />
          <div className="flex items-center gap-2.5">
            <FilerAvatar filer={data.highestAlpha} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-medium text-ink truncate">{data.highestAlpha.full_name}</div>
              <div className="text-mini tabular-nums">
                <span className={data.highestAlpha.metric >= 0 ? "text-buy font-semibold" : "text-sell font-semibold"}>
                  {data.highestAlpha.metric >= 0 ? "+" : ""}
                  {data.highestAlpha.metric.toFixed(0)}%
                </span>
                <span className="text-ink_muted"> cumulative vs SPY · n={data.highestAlpha.scored_buys}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Hottest stock */}
      {data.hottestStock && (
        <Card onClick={() => navigate(`/ticker/${data.hottestStock.ticker}`)}>
          <Metric label={adminActive ? `Most traded · ${admin.short}` : "Hot stock (60d)"} />
          <div className="flex items-center gap-2">
            <TickerBadge ticker={data.hottestStock.ticker} size="md" />
            {data.hottestStock.change != null && (
              <span
                className={`text-mini tabular-nums font-semibold ${data.hottestStock.change >= 0 ? "text-buy" : "text-sell"}`}
              >
                {data.hottestStock.change >= 0 ? "+" : ""}
                {data.hottestStock.change.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-mini text-ink_muted tabular-nums mt-1">
            {fmtInt(data.hottestStock.trades)} {adminActive ? "trades during window" : "trades in last 60 days"}
          </div>
        </Card>
      )}

      {/* Best hit rate */}
      {data.bestHitRate && (
        <Card onClick={() => navigate(`/filer/${data.bestHitRate.id}`)}>
          <Metric label="Best hit rate" />
          <div className="flex items-center gap-2.5">
            <FilerAvatar filer={data.bestHitRate} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-medium text-ink truncate">{data.bestHitRate.full_name}</div>
              <div className="text-mini tabular-nums">
                <span className="text-buy font-semibold">{(data.bestHitRate.metric * 100).toFixed(0)}%</span>
                <span className="text-ink_muted">
                  {" "}
                  · {data.bestHitRate.wins}/{data.bestHitRate.scored} beat SPY
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Biggest trade */}
      {data.biggestTrade && (
        <Card onClick={() => data.biggestTrade.filer && navigate(`/filer/${data.biggestTrade.filer.id}`)}>
          <Metric label="Biggest single trade" />
          <div className="flex items-center gap-2">
            <span className="text-[1rem] font-semibold text-ink tabular-nums">{fmtUSD(data.biggestTrade.mid)}</span>
            {data.biggestTrade.ticker && <TickerBadge ticker={data.biggestTrade.ticker} size="sm" />}
          </div>
          <div className="text-mini text-ink_muted truncate mt-1">
            {data.biggestTrade.filer_name}
            {data.biggestTrade.date && <span className="text-ink_faint"> · {data.biggestTrade.date}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

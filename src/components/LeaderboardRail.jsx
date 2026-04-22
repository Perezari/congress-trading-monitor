import React, { useMemo } from "react";
import { navigate } from "../router";
import { fmtInt, fmtUSD } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// Five editorial "podium" cards answering the five questions most readers bring:
// who trades most, who earns most, which stock is hot, who has the best hit rate,
// what's the biggest single trade.

function Card({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[150px] sm:min-w-[180px] text-left p-3.5 rounded-md border border-stroke bg-panel hover:border-ink_faint hover:shadow-card transition-all flex flex-col"
    >
      {children}
    </button>
  );
}

function Metric({ label }) {
  return (
    <div className="mb-2">
      <span className="text-mini text-ink_muted font-medium">{label}</span>
    </div>
  );
}

export default function LeaderboardRail({ filers = [], returns = [], trades = [], prices = {} }) {
  const data = useMemo(() => {
    // Most active
    const topActive = [...filers].sort((a, b) => b.trade_count - a.trade_count)[0];
    const mostActive = topActive ? { ...topActive, metric: topActive.trade_count } : null;

    // Highest alpha
    const topAlpha = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess)[0];
    const highestAlpha = topAlpha
      ? {
          ...(filers.find((x) => x.id === topAlpha.id) || topAlpha),
          metric: topAlpha.weighted_excess,
          scored_buys: topAlpha.scored_buys,
        }
      : null;

    // Hot stock (60d): >=5 trades in last 60 days, pick highest trade count
    let hottestStock = null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = new Map();
    for (const t of trades) {
      if (!t.ticker || !t.transaction_date) continue;
      if (t.transaction_date < cutoffStr) continue;
      recent.set(t.ticker, (recent.get(t.ticker) || 0) + 1);
    }
    let bestTicker = null;
    let bestScore = 0;
    for (const [tk, n] of recent) {
      if (n >= 5 && n > bestScore) {
        bestScore = n;
        bestTicker = tk;
      }
    }
    if (bestTicker) {
      const p = prices[bestTicker];
      const change = p?.latest && p?.previous ? ((p.latest.close - p.previous.close) / p.previous.close) * 100 : null;
      hottestStock = { ticker: bestTicker, trades: bestScore, change };
    }

    // Best hit rate — filers with >=20 scored buys, highest % beating SPY
    const byFiler = new Map();
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      if (!isBuy || t.excess_since == null || !t.filer_id) continue;
      if (!byFiler.has(t.filer_id)) byFiler.set(t.filer_id, { scored: 0, wins: 0 });
      const e = byFiler.get(t.filer_id);
      e.scored++;
      if (t.excess_since > 0) e.wins++;
    }
    let bestHitRate = null;
    let bestRate = 0;
    for (const [id, stats] of byFiler) {
      if (stats.scored < 20) continue;
      const rate = stats.wins / stats.scored;
      if (rate > bestRate) {
        bestRate = rate;
        const f = filers.find((x) => x.id === id);
        if (f) bestHitRate = { ...f, metric: rate, scored: stats.scored, wins: stats.wins };
      }
    }

    // Biggest single trade
    let best = null;
    let bestMid = 0;
    for (const t of trades) {
      if (!t.amount_range_low || !t.amount_range_high) continue;
      const mid = (t.amount_range_low + t.amount_range_high) / 2;
      if (mid > bestMid) {
        bestMid = mid;
        best = t;
      }
    }
    const biggestTrade = best
      ? {
          filer: filers.find((x) => x.id === best.filer_id),
          filer_name: best.filer_name,
          ticker: best.ticker,
          mid: bestMid,
          date: best.transaction_date,
        }
      : null;

    return { mostActive, highestAlpha, hottestStock, bestHitRate, biggestTrade };
  }, [filers, returns, trades, prices]);

  return (
    <div className="flex gap-3 flex-wrap">
      {data.mostActive && (
        <Card onClick={() => navigate(`/filer/${data.mostActive.id}`)}>
          <Metric label="Most active" />
          <div className="flex items-center gap-2.5">
            <FilerAvatar filer={data.mostActive} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-medium text-ink truncate">{data.mostActive.full_name}</div>
              <div className="text-mini text-ink_muted tabular-nums">{fmtInt(data.mostActive.metric)} trades</div>
            </div>
          </div>
        </Card>
      )}

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
                <span className="text-ink_muted"> vs SPY · n={data.highestAlpha.scored_buys}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {data.hottestStock && (
        <Card onClick={() => navigate(`/ticker/${data.hottestStock.ticker}`)}>
          <Metric label="Hot stock (60d)" />
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
            {fmtInt(data.hottestStock.trades)} trades in last 60 days
          </div>
        </Card>
      )}

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

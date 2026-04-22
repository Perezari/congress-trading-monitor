import React from "react";
import { TickerLabel } from "./components/TickerBadge";
import { navigate } from "./router";
import { TABLE_HEADER_CLS } from "./ui";

function dailyChange(p) {
  if (!p?.latest || !p?.previous) return null;
  const a = p.latest.close;
  const b = p.previous.close;
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

export default function TickerBoard({ tickers, prices = {} }) {
  return (
    <div className="border border-stroke rounded-md bg-panel overflow-hidden">
      <div className={`grid grid-cols-[72px_minmax(0,1fr)_88px_96px] gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}>
        <span>Ticker</span>
        <span className="tabular-nums text-right">Δ1d</span>
        <span className="tabular-nums text-right">Trades</span>
        <span className="tabular-nums text-right">Buy / Sell</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {tickers.map((t, i) => {
          const change = dailyChange(prices[t.ticker]);
          return (
            <button
              key={t.ticker}
              onClick={() => navigate(`/ticker/${t.ticker}`)}
              className="w-full grid grid-cols-[72px_minmax(0,1fr)_88px_96px] gap-3 px-4 py-[10px] items-center text-left even:bg-[lch(95.5%_0_282)] hover:bg-muted"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <TickerLabel ticker={t.ticker} size="sm" />
              </div>
              <div className="text-right tabular-nums">
                {change != null ? (
                  <span
                    className={`text-small whitespace-nowrap ${change >= 0 ? "text-buy" : "text-sell"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-small text-ink_faint">—</span>
                )}
              </div>
              <div className="text-small tabular-nums text-right">
                <span className="text-ink font-semibold">{t.trade_count}</span>
                <span className="text-ink_muted ml-1 text-mini">· {t.filer_count}f</span>
              </div>
              <span className="text-mini tabular-nums text-right whitespace-nowrap">
                <span className="text-buy">{t.purchases}</span>
                <span className="text-ink_faint mx-[2px]">/</span>
                <span className="text-sell">{t.sales}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

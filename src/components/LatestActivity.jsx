import React, { useMemo } from "react";
import { navigate } from "../router";
import { cleanAssetName, fmtUSD, TABLE_HEADER_CLS } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// Latest activity feed — last N filings, sorted by filing_date desc.
// Shows who just disclosed what, for the "check on the dataset" reader who
// wants a pulse on what came in today vs what the leaderboards surface.
function midpoint(t) {
  return t.amount_range_low != null && t.amount_range_high != null
    ? (t.amount_range_low + t.amount_range_high) / 2
    : null;
}

function relativeDate(iso) {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const days = Math.round((Date.now() - then) / 86400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return iso;
}

export default function LatestActivity({ trades, limit = 12 }) {
  const rows = useMemo(() => {
    return [...trades]
      .filter((t) => t.filing_date)
      .sort((a, b) => (a.filing_date < b.filing_date ? 1 : a.filing_date > b.filing_date ? -1 : 0))
      .slice(0, limit);
  }, [trades, limit]);

  if (!rows.length) return null;

  return (
    <div className="border border-stroke rounded-md bg-panel overflow-hidden">
      <div
        className={`grid grid-cols-[minmax(0,1fr)_56px_88px_88px] gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
      >
        <span>Filer</span>
        <span>Side</span>
        <span className="tabular-nums text-right">Amount</span>
        <span className="tabular-nums text-right">Filed</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {rows.map((t) => {
          const mid = midpoint(t);
          const tt = (t.transaction_type || "").toLowerCase();
          const isBuy = tt.includes("urchase") || tt === "p";
          const isSell = tt.includes("ale") || tt === "s";
          const side = isBuy ? "Buy" : isSell ? "Sell" : (t.transaction_type || "—").slice(0, 5);
          return (
            <button
              key={t.id}
              onClick={() => t.filer_id && navigate(`/filer/${t.filer_id}`)}
              className="w-full grid grid-cols-[minmax(0,1fr)_56px_88px_88px] gap-3 px-4 py-[10px] items-center text-left even:bg-[lch(95.5%_0_282)] hover:bg-muted"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FilerAvatar filer={{ full_name: t.filer_name, chamber: t.chamber, branch: t.branch }} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="text-small text-ink font-medium truncate">{t.filer_name}</div>
                  <div className="flex items-center gap-1.5 mt-[1px]">
                    {t.ticker ? (
                      <TickerBadge ticker={t.ticker} size="sm" />
                    ) : (
                      <span className="text-mini text-ink_faint">—</span>
                    )}
                    <span className="text-mini text-ink_muted truncate" title={t.asset_name}>
                      {cleanAssetName(t.asset_name) || ""}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`text-mini font-medium ${isBuy ? "text-buy" : isSell ? "text-sell" : "text-ink_muted"}`}>
                {side}
              </span>
              <span className="text-small tabular-nums text-right text-ink">{mid != null ? fmtUSD(mid) : "—"}</span>
              <span className="text-mini tabular-nums text-right text-ink_muted whitespace-nowrap">
                {relativeDate(t.filing_date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

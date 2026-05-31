import React, { useMemo, useState } from "react";
import { FilerAvatar } from "./components/TablePrimitives";
import { TickerBadge } from "./components/TickerBadge";
import {
  cleanAssetName,
  fmtAmountRange,
  fmtInt,
  fmtUSD,
  Pill,
  RowLink,
  TABLE_HEADER_CLS,
  TABLE_ZEBRA_CLS,
  txnColor,
} from "./ui";

const COLUMNS = [
  { key: "filer_name", label: "Filer", align: "left", sortable: true, width: "minmax(200px,1.6fr)" },
  { key: "ticker", label: "Ticker", align: "left", sortable: true, width: "80px" },
  { key: "asset_name", label: "Asset", align: "left", sortable: false, width: "minmax(180px,1.2fr)" },
  { key: "transaction_type", label: "Side", align: "left", sortable: true, width: "56px" },
  { key: "amount", label: "Amount", align: "right", sortable: true, width: "160px" },
  { key: "transaction_date", label: "Traded", align: "right", sortable: true, width: "96px" },
  { key: "filing_date", label: "Filed", align: "right", sortable: true, width: "96px" },
  { key: "days_to_file", label: "Lag", align: "right", sortable: true, width: "56px" },
  { key: "excess_since", label: "vs SPY", align: "right", sortable: true, width: "80px" },
  { key: "doc_url", label: "", align: "right", sortable: false, width: "36px" },
];

const DEFAULT_PAGE_SIZE = 200;
const GRID_TEMPLATE = COLUMNS.map((c) => c.width).join(" ");

// Sort indicator: dimmed double-chevron on inactive sortable columns,
// solid single arrow showing direction on the active column. Lets users
// see at a glance which columns they can sort without hover discovery.
function SortIndicator({ active, dir }) {
  if (!active) {
    return (
      <svg width="8" height="10" viewBox="0 0 8 10" className="text-ink_faint shrink-0" aria-hidden="true">
        <path d="M2 4 L4 2 L6 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M2 6 L4 8 L6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-ink shrink-0" aria-hidden="true">
      <path
        d={dir === "asc" ? "M2 6 L5 3 L8 6" : "M2 4 L5 7 L8 4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Owner code chip: STOCK Act filings label who in the household the trade
// belongs to. SP = spouse, DC = dependent child, JT = joint, DJ = dependent
// joint. If it's blank or "self", don't render a chip (that's the default).
const OWNER_LABELS = {
  SP: { label: "SP", title: "Trade by spouse" },
  DC: { label: "DC", title: "Trade by dependent child" },
  JT: { label: "JT", title: "Joint account" },
  DJ: { label: "DJ", title: "Dependent joint account" },
};

function OwnerChip({ owner }) {
  const meta = owner ? OWNER_LABELS[owner.toUpperCase?.()] : null;
  if (!meta) return null;
  return (
    <span
      className="shrink-0 inline-flex items-center px-[5px] h-[15px] rounded-[3px] bg-accent_bg text-accent text-[0.625rem] font-semibold tabular-nums"
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

function assetTypeTag(type) {
  if (!type) return null;
  const t = String(type).toUpperCase();
  if (t === "OP" || t === "OPTION" || t.includes("OPTION")) return { label: "OP", title: "Option" };
  if (t === "BD" || t.includes("BOND") || t === "CS") return { label: "BD", title: "Bond / corporate debt" };
  if (t === "CT" || t.includes("CRYPTO")) return { label: "CR", title: "Cryptocurrency" };
  if (t === "MF" || t.includes("FUND")) return { label: "FD", title: "Fund" };
  return null;
}

function midpoint(t) {
  return t.amount_range_low != null && t.amount_range_high != null
    ? (t.amount_range_low + t.amount_range_high) / 2
    : null;
}

export default function TradesTable({ trades, tall = false, sortCol, onSort, filersById }) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [internalSort, setInternalSort] = useState({ key: "filing_date", dir: "desc" });
  const col = sortCol ?? internalSort;
  const setCol = onSort ?? setInternalSort;
  // Only sort internally when the caller hasn't already sorted (sortCol === undefined).
  // TradesPage pre-sorts on the page level; FilerPage/TickerPage pass unsorted data.
  const controlled = sortCol !== undefined;

  const sortedTrades = useMemo(() => {
    if (controlled) return trades;
    const { key, dir } = col;
    const mul = dir === "asc" ? 1 : -1;
    const valueFor = (t) => {
      if (key === "amount") {
        return t.amount_range_low != null && t.amount_range_high != null
          ? (t.amount_range_low + t.amount_range_high) / 2
          : -Infinity;
      }
      if (key === "excess_since" || key === "days_to_file" || key === "ret_since") {
        const v = t[key];
        return v == null ? (dir === "asc" ? Infinity : -Infinity) : v;
      }
      return t[key] ?? "";
    };
    return [...trades].sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }, [trades, col, controlled]);

  const displayed = sortedTrades.slice(0, pageSize);

  const toggleSort = (k) => {
    if (col.key === k) setCol({ key: k, dir: col.dir === "asc" ? "desc" : "asc" });
    else setCol({ key: k, dir: "desc" });
  };

  return (
    <div className="border border-stroke rounded-md bg-panel overflow-hidden">
      {/* Mobile: stacked cards. Desktop (sm+): the original wide grid. */}
      <div className="lg:hidden divide-y divide-stroke_soft">
        {displayed.length === 0 && (
          <div className="px-4 py-10 text-small text-ink_muted text-center">No trades match the current filters.</div>
        )}
        {displayed.map((t) => (
          <MobileTradeCard key={t.id} t={t} filersById={filersById} />
        ))}
      </div>
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[1100px]">
          <div
            className={`grid gap-3 px-3 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            {COLUMNS.map((c) => {
              const isActive = c.sortable && col.key === c.key;
              return (
                <button
                  key={c.key}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  className={`text-${c.align} inline-flex items-center gap-1 ${c.sortable ? "cursor-pointer hover:text-ink" : "cursor-default"} ${c.align === "right" ? "justify-end" : c.align === "center" ? "justify-center" : "justify-start"} ${isActive ? "text-ink" : ""}`}
                >
                  <span>{c.label}</span>
                  {c.sortable && <SortIndicator active={isActive} dir={col.dir} />}
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-stroke_soft">
            {displayed.length === 0 && (
              <div className="px-4 py-10 text-small text-ink_muted text-center">
                No trades match the current filters.
              </div>
            )}
            {displayed.map((t) => {
              const mid = midpoint(t);
              const assetTag = assetTypeTag(t.asset_type);
              const tt = (t.transaction_type || "").toLowerCase();
              const isBuy = tt.includes("urchase") || tt === "p" || /^p($|\s|\()/.test(tt);
              const isSell = tt.includes("ale") || tt === "s" || /^s($|\s|\()/.test(tt);
              const isPartial = tt.includes("parti");
              const isExchange = tt.includes("xchang");
              const sideLabel = isBuy
                ? "Buy"
                : isSell
                  ? isPartial
                    ? "Sell·p"
                    : "Sell"
                  : isExchange
                    ? "Exch"
                    : (t.transaction_type || "—").slice(0, 6);
              const filerPhoto = filersById?.get?.(t.filer_id);
              return (
                <div
                  key={t.id}
                  className="grid gap-3 px-3 py-[10px] items-center even:bg-[lch(95.5%_0_282)] hover:bg-muted/70 text-small"
                  style={{ gridTemplateColumns: GRID_TEMPLATE }}
                >
                  <RowLink
                    to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
                    className="flex items-center gap-2 min-w-0 text-left text-ink no-underline"
                  >
                    <FilerAvatar
                      filer={filerPhoto ?? { full_name: t.filer_name, chamber: t.chamber, branch: t.branch }}
                      size={24}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-ink font-medium truncate hover:text-accent">{t.filer_name}</span>
                        <OwnerChip owner={t.owner} />
                      </div>
                      <div className="text-mini text-ink_muted truncate mt-[1px]">
                        {t.chamber
                          ? `${t.chamber === "senate" ? "Senate" : "House"} · ${t.party ?? "-"}${t.state ? ` · ${t.state}` : ""}`
                          : `${t.level ?? ""} ${t.agency ?? ""}`.trim()}
                      </div>
                    </div>
                  </RowLink>

                  <div className="flex items-center gap-1.5 min-w-0">
                    {t.ticker ? (
                      <RowLink
                        to={`/ticker/${t.ticker}`}
                        className="inline-flex items-center gap-1.5 truncate hover:opacity-80"
                      >
                        <TickerBadge ticker={t.ticker} size="sm" />
                      </RowLink>
                    ) : (
                      <span className="text-ink_faint">—</span>
                    )}
                    {assetTag && (
                      <span
                        className="inline-flex items-center px-[5px] h-[15px] rounded-[3px] bg-muted text-ink_muted text-[0.625rem] font-semibold tabular-nums"
                        title={assetTag.title}
                      >
                        {assetTag.label}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-ink_muted truncate" title={t.asset_name}>
                      {cleanAssetName(t.asset_name)}
                    </div>
                    {t.comment && (
                      <div className="text-mini text-ink_faint truncate mt-[1px] italic" title={t.comment}>
                        {t.comment}
                      </div>
                    )}
                  </div>

                  <div
                    className={`font-medium uppercase tracking-[0.02em] text-mini ${isBuy ? "text-buy" : isSell ? "text-sell" : "text-ink_muted"}`}
                    title={t.transaction_type}
                  >
                    {sideLabel}
                  </div>

                  <span className="text-right text-ink tabular-nums" title={t.amount_range_label ?? ""}>
                    {fmtAmountRange(t)}
                  </span>

                  <div className="text-right text-ink_muted tabular-nums font-mono">{t.transaction_date ?? "--"}</div>

                  <div className="text-right tabular-nums font-mono">
                    <span className={t.is_late ? "text-warn font-medium" : "text-ink_muted"}>
                      {t.filing_date ?? "--"}
                    </span>
                  </div>

                  <div
                    className="text-right tabular-nums font-mono"
                    title={
                      t.days_to_file != null
                        ? `${t.days_to_file} days from transaction to filing${t.is_late ? " (late — STOCK Act requires ≤45)" : ""}`
                        : undefined
                    }
                  >
                    {t.days_to_file == null ? (
                      <span className="text-ink_faint">—</span>
                    ) : (
                      <span className={t.is_late ? "text-warn font-medium" : "text-ink_muted"}>{t.days_to_file}d</span>
                    )}
                  </div>

                  <div
                    className={`text-right tabular-nums font-medium ${
                      t.excess_since == null ? "text-ink_faint" : t.excess_since >= 0 ? "text-buy" : "text-sell"
                    }`}
                  >
                    {t.excess_since == null ? "—" : `${t.excess_since >= 0 ? "+" : ""}${t.excess_since.toFixed(1)}%`}
                  </div>

                  <div className="text-right">
                    {t.doc_url && (
                      <a
                        href={t.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-ink_muted hover:text-accent text-mini tabular-nums whitespace-nowrap"
                        title={
                          t.doc_url.includes("efdsearch.senate.gov")
                            ? "Open filing detail page on the Senate EFD portal (one-time terms acceptance)"
                            : "Open original PDF filing"
                        }
                      >
                        {t.doc_url.includes("efdsearch.senate.gov") ? "Details" : "PDF"}&nbsp;↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {trades.length > displayed.length && (
        <div className="px-4 py-3 border-t border-stroke flex items-center justify-between text-small">
          <span className="text-ink_muted tabular-nums">
            Showing {fmtInt(displayed.length)} of {fmtInt(trades.length)}
          </span>
          <button
            onClick={() => setPageSize((n) => n + 200)}
            className="px-3 h-7 rounded-md border border-stroke text-ink_muted hover:text-ink hover:border-ink_faint"
          >
            Show 200 more
          </button>
        </div>
      )}
    </div>
  );
}

// Stacked card row for narrow viewports. Surfaces the same data as the
// desktop grid but in a vertical layout that fits a phone without horizontal
// scrolling. Tap the filer avatar/name to drill in; tap the ticker badge to
// open the ticker page.
function MobileTradeCard({ t, filersById }) {
  const mid = midpoint(t);
  const tt = (t.transaction_type || "").toLowerCase();
  const isBuy = tt.includes("urchase") || tt === "p" || /^p($|\s|\()/.test(tt);
  const isSell = tt.includes("ale") || tt === "s" || /^s($|\s|\()/.test(tt);
  const isPartial = tt.includes("parti");
  const isExchange = tt.includes("xchang");
  const sideLabel = isBuy
    ? "Buy"
    : isSell
      ? isPartial
        ? "Sell·p"
        : "Sell"
      : isExchange
        ? "Exch"
        : (t.transaction_type || "—").slice(0, 6);
  const filerPhoto = filersById?.get?.(t.filer_id);
  const assetTag = assetTypeTag(t.asset_type);
  const officeLine = t.chamber
    ? `${t.chamber === "senate" ? "Senate" : "House"} · ${t.party ?? "-"}${t.state ? ` · ${t.state}` : ""}`
    : `${t.level ?? ""} ${t.agency ?? ""}`.trim();

  const cleanAsset = cleanAssetName(t.asset_name);
  const dateLine =
    t.transaction_date && t.filing_date
      ? `${t.transaction_date} → ${t.filing_date}${t.days_to_file != null ? ` · ${t.days_to_file}d${t.is_late ? " late" : ""}` : ""}`
      : t.transaction_date || t.filing_date || "";

  return (
    <div className="px-3 py-2.5 even:bg-[lch(95.5%_0_282)]">
      <div className="flex items-start justify-between gap-3">
        <RowLink
          to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
          className="flex items-center gap-2 min-w-0 text-left flex-1 text-ink no-underline"
        >
          <FilerAvatar
            filer={filerPhoto ?? { full_name: t.filer_name, chamber: t.chamber, branch: t.branch }}
            size={28}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-small text-ink font-medium truncate">{t.filer_name}</span>
              <OwnerChip owner={t.owner} />
            </div>
            {officeLine && <div className="text-mini text-ink_muted truncate mt-[1px]">{officeLine}</div>}
          </div>
        </RowLink>
        <div className="text-right shrink-0 leading-tight">
          <div className="flex items-baseline gap-1.5 justify-end">
            <span
              className={`text-mini font-semibold uppercase tracking-[0.02em] ${isBuy ? "text-buy" : isSell ? "text-sell" : "text-ink_muted"}`}
            >
              {sideLabel}
            </span>
            <span className="text-small font-medium text-ink tabular-nums" title={t.amount_range_label ?? ""}>
              {fmtAmountRange(t)}
            </span>
          </div>
          {t.excess_since != null && (
            <div className={`text-mini tabular-nums mt-[2px] ${t.excess_since >= 0 ? "text-buy" : "text-sell"}`}>
              {t.excess_since >= 0 ? "+" : ""}
              {t.excess_since.toFixed(1)}% vs SPY
            </div>
          )}
        </div>
      </div>

      <div className="mt-1.5 ml-9 flex items-center gap-1.5 min-w-0">
        {t.ticker ? (
          <RowLink to={`/ticker/${t.ticker}`} className="inline-flex items-center hover:opacity-80 shrink-0">
            <TickerBadge ticker={t.ticker} size="sm" />
          </RowLink>
        ) : (
          <span className="text-ink_faint shrink-0">—</span>
        )}
        {assetTag && (
          <span
            className="inline-flex items-center px-[5px] h-[15px] rounded-[3px] bg-muted text-ink_muted text-[0.625rem] font-semibold tabular-nums shrink-0"
            title={assetTag.title}
          >
            {assetTag.label}
          </span>
        )}
        {cleanAsset && (
          <span className="text-mini text-ink_muted truncate min-w-0" title={t.asset_name}>
            {cleanAsset}
          </span>
        )}
      </div>
      {t.comment && (
        <div className="ml-9 text-mini text-ink_faint italic truncate mt-[1px]" title={t.comment}>
          {t.comment}
        </div>
      )}

      {(dateLine || t.doc_url) && (
        <div className="mt-1.5 ml-9 flex items-center justify-between gap-2 text-mini text-ink_muted tabular-nums">
          <span className={`font-mono truncate ${t.is_late ? "text-warn font-medium" : ""}`}>{dateLine}</span>
          {t.doc_url && (
            <a
              href={t.doc_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-ink_muted hover:text-accent whitespace-nowrap shrink-0"
            >
              {t.doc_url.includes("efdsearch.senate.gov") ? "Details" : "PDF"}&nbsp;↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

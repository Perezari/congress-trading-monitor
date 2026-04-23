import React, { useEffect, useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import PersonalTimeline from "../components/PersonalTimeline";
import { FilerAvatar as AvatarPrimitive } from "../components/TablePrimitives";
import { TickerBadge, TickerLabel } from "../components/TickerBadge";
import { navigate } from "../router";
import TradesTable from "../TradesTable";
import { branchPill, Card, cleanAssetName, fmtInt, fmtUSD, Link, SectionHeader, TABLE_HEADER_CLS } from "../ui";

function role(f) {
  if (!f) return "";
  if (f.branch === "executive") return `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "Executive branch official";
  // Prefer the detailed "U.S. Representative · CA-12" office if we have it; fall back to chamber+state.
  if (f.office) {
    const parts = [f.office];
    if (f.party) parts.push(f.party);
    return parts.join(" · ");
  }
  return `${f.chamber === "senate" ? "U.S. Senate" : "U.S. House"}${f.party ? " · " + f.party : ""}${f.state ? " · " + f.state : ""}`;
}

export default function FilerPage({ filerId, filersIndex, filersById, prices: pricesProp, returns = [] }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const prices = pricesProp ?? {};

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/data/filer/${encodeURIComponent(filerId)}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(setError);
  }, [filerId]);

  const filer = data?.filer ?? null;
  const trades = data?.trades ?? [];

  const stats = useMemo(() => {
    let buys = 0;
    let sells = 0;
    let late = 0;
    let volume = 0;
    const byTicker = new Map();
    const lagValues = [];
    let earliest = null;
    let latest = null;
    let excessSum = 0;
    let excessWeight = 0;
    let scoredBuys = 0;
    let wins = 0; // scored buys with excess > 0
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (isBuy) buys++;
      else if (isSell) sells++;
      if (t.is_late) late++;
      if (t.days_to_file != null && t.days_to_file >= 0) lagValues.push(t.days_to_file);
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
      if (mid) volume += mid;
      if (t.ticker) {
        if (!byTicker.has(t.ticker))
          byTicker.set(t.ticker, {
            ticker: t.ticker,
            buys: 0,
            sells: 0,
            total: 0,
            volume: 0,
            excessSum: 0,
            excessWeight: 0,
            contribSum: 0,
            wins: 0,
            scored: 0,
          });
        const e = byTicker.get(t.ticker);
        e.total++;
        if (isBuy) e.buys++;
        else if (isSell) e.sells++;
        if (mid) e.volume += mid;
        if (isBuy && t.excess_since != null && mid) {
          e.excessSum += t.excess_since * mid;
          e.excessWeight += mid;
          e.contribSum += t.excess_since * mid;
          e.scored++;
          if (t.excess_since > 0) e.wins++;
        }
      }
      if (t.transaction_date) {
        if (!earliest || t.transaction_date < earliest) earliest = t.transaction_date;
        if (!latest || t.transaction_date > latest) latest = t.transaction_date;
      }
      if (isBuy && t.excess_since != null && mid) {
        excessSum += t.excess_since * mid;
        excessWeight += mid;
        scoredBuys++;
        if (t.excess_since > 0) wins++;
      }
    }
    const weightedExcess = excessWeight > 0 ? excessSum / excessWeight : null;
    const hitRate = scoredBuys > 0 ? wins / scoredBuys : null;
    // Ticker-level attribution: weightedExcess within ticker, contribution share
    const tickerAttribution = [...byTicker.values()].map((e) => ({
      ...e,
      tickerAlpha: e.excessWeight > 0 ? e.excessSum / e.excessWeight : null,
      tickerHitRate: e.scored > 0 ? e.wins / e.scored : null,
    }));
    const totalContribAbs = tickerAttribution.reduce((s, e) => s + Math.abs(e.contribSum), 0);
    for (const e of tickerAttribution) {
      e.contribShare = totalContribAbs > 0 ? (Math.abs(e.contribSum) / totalContribAbs) * 100 : 0;
      e.signedContribShare = totalContribAbs > 0 ? (e.contribSum / totalContribAbs) * 100 : 0;
    }
    tickerAttribution.sort((a, b) => Math.abs(b.contribSum) - Math.abs(a.contribSum));
    const topTickers = [...byTicker.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    // Which individual purchases drive the weighted alpha? Each scored buy
    // contributes (mid * excess_since) to the numerator of weightedExcess.
    // Ranking by |contribution| reveals whether the headline number is broad
    // skill or a handful of moonshots held to today.
    const alphaDrivers = [];
    if (excessWeight > 0) {
      const totalContribAbs = trades.reduce((s, t) => {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
        if (isBuy && t.excess_since != null && mid) return s + Math.abs(t.excess_since * mid);
        return s;
      }, 0);
      for (const t of trades) {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
        if (!isBuy || t.excess_since == null || !mid || !t.transaction_date) continue;
        const contribution = t.excess_since * mid;
        alphaDrivers.push({
          id: t.id,
          ticker: t.ticker,
          asset_name: t.asset_name,
          transaction_date: t.transaction_date,
          mid,
          excess: t.excess_since,
          ret: t.ret_since,
          doc_url: t.doc_url,
          contribution,
          share: totalContribAbs > 0 ? (Math.abs(contribution) / totalContribAbs) * 100 : 0,
        });
      }
      alphaDrivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    }
    const sortedLag = [...lagValues].sort((a, b) => a - b);
    const medianLag = sortedLag.length ? sortedLag[Math.floor((sortedLag.length - 1) * 0.5)] : null;
    return {
      buys,
      sells,
      late,
      volume,
      topTickers,
      tickerAttribution,
      earliest,
      latest,
      count: trades.length,
      weightedExcess,
      scoredBuys,
      wins,
      hitRate,
      alphaDrivers,
      medianLag,
      lateShare: lagValues.length ? late / lagValues.length : null,
    };
  }, [trades]);

  // Peer rank among all filers with enough scored buys to be comparable.
  // Matches the ReturnsLeaderboard threshold (driven by server-side returns.json).
  const peerContext = useMemo(() => {
    if (!returns || returns.length === 0 || stats.weightedExcess == null) return null;
    const sorted = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess);
    const idx = sorted.findIndex((r) => r.id === filerId);
    if (idx === -1) return { total: sorted.length, rank: null };
    return { total: sorted.length, rank: idx + 1 };
  }, [returns, filerId, stats.weightedExcess]);

  const filtered = useMemo(() => {
    if (!filer) return [];
    const enriched = trades.map((t) => ({
      ...t,
      filer_name: filer.full_name,
      chamber: filer.chamber,
      party: filer.party,
      state: filer.state,
      agency: filer.agency,
      level: filer.level,
    }));
    return applyFilters(enriched, filters);
  }, [trades, filters, filer]);

  if (error) {
    const fallback = filersIndex?.find((f) => f.id === filerId);
    const isMissing = !fallback;
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
        <div className="text-regular font-medium text-ink mb-2">
          {isMissing ? "Filer not found" : "No parsed trades for this filer yet"}
        </div>
        <div className="text-small text-ink_muted">
          {isMissing ? (
            <>
              No filer matches <span className="font-mono text-ink">{filerId}</span>. It may have been deduped into a
              canonical record, renamed, or the URL was mistyped.
            </>
          ) : (
            <>
              They appear in the dataset (<span className="font-medium text-ink">{fallback.full_name}</span>) but their
              PTRs are image-based PDFs that still need OCR.
            </>
          )}
        </div>
        <Link to="/filers" className="text-small mt-3 inline-block">
          ← Browse all filers
        </Link>
      </div>
    );
  }

  if (!data || !filer) {
    return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 text-ink_muted text-small">Loading…</div>;
  }

  const meta = branchPill(filer);
  const coverageStart = stats.earliest?.slice(0, 7);
  const coverageEnd = stats.latest?.slice(0, 7);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-16">
      <nav className="text-mini text-ink_muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="no-underline hover:text-ink hover:no-underline">
          Overview
        </Link>
        <span className="text-ink_faint">›</span>
        <Link to="/filers" className="no-underline hover:text-ink hover:no-underline">
          Filers
        </Link>
        <span className="text-ink_faint">›</span>
        <span className="text-ink">{filer.full_name}</span>
      </nav>

      {/* Compact hero: 40px avatar, name + linear-style pill, one-line role + coverage, rank chip on the right */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarPrimitive filer={filer} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.012em] text-ink">
                {filer.full_name}
              </h1>
              <BranchDotPill filer={filer} />
            </div>
            <div className="text-small text-ink_muted mt-0.5 tabular-nums">
              {role(filer)}
              {coverageStart && (
                <span className="text-ink_faint">
                  {" "}
                  ·{" "}
                  <span className="font-mono">
                    {coverageStart} → {coverageEnd}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-8 flex-wrap">
          {stats.medianLag != null && (
            <HeroStat
              label="Median lag"
              value={`${stats.medianLag}d`}
              hint={
                stats.lateShare != null && stats.lateShare > 0
                  ? `${(stats.lateShare * 100).toFixed(0)}% late`
                  : null
              }
              hintTone={stats.lateShare != null && stats.lateShare >= 0.25 ? "warn" : "muted"}
              title={`${stats.late} of ${stats.count} filings were disclosed more than 45 days after the trade`}
            />
          )}
          {peerContext?.rank != null && (
            <HeroStat
              label="Outperformance rank"
              value={`#${peerContext.rank}`}
              hint={`of ${peerContext.total} ranked`}
            />
          )}
        </div>
      </div>

      <ImaginaryPortfolio trades={trades} />

      {stats.weightedExcess != null && stats.alphaDrivers && stats.alphaDrivers.length > 0 && (
        <AlphaDriversSection drivers={stats.alphaDrivers} />
      )}

      {stats.tickerAttribution && stats.tickerAttribution.filter((t) => t.ticker).length > 0 && (
        <TickerAttributionSection rows={stats.tickerAttribution.filter((t) => t.ticker)} />
      )}

      <div className="mb-10">
        <SectionHeader title="Timeline" />
        <Card className="p-4">
          <PersonalTimeline trades={trades} />
        </Card>
      </div>

      <SectionHeader title="All trades" subtitle={`${fmtInt(filtered.length)} of ${fmtInt(trades.length)}`} />
      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} trades={trades} />
      </div>
      <TradesTable trades={filtered} tall filersById={filersById} />
    </div>
  );
}

// Header stat block: uppercase tracked label, prominent tabular value, muted
// hint. Matches the typographic rhythm of the ImaginaryPortfolio card.
function HeroStat({ label, value, hint, hintTone = "muted", title }) {
  const hintCls = hintTone === "warn" ? "text-warn" : "text-ink_muted";
  return (
    <div title={title}>
      <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">{label}</div>
      <div className="mt-1 text-[1.375rem] font-semibold tabular-nums tracking-[-0.012em] leading-none text-ink">
        {value}
      </div>
      {hint && <div className={`mt-1.5 text-mini tabular-nums ${hintCls}`}>{hint}</div>}
    </div>
  );
}

// Linear-style categorical pill (colored dot + label). Matches HeroScatter badges.
function BranchDotPill({ filer }) {
  const meta = branchPill(filer);
  const bg = meta.tone === "amber" ? "#fbf1df" : meta.tone === "violet" ? "#ece8fb" : "#e9edf8";
  const fg = meta.tone === "amber" ? "#a86a18" : meta.tone === "violet" ? "#6a51c8" : "#3c4ba5";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 h-[20px] text-mini font-semibold"
      style={{ backgroundColor: bg, color: fg, letterSpacing: "0.02em" }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: fg }} />
      {meta.label}
    </span>
  );
}

// Performance by ticker: net contribution to weighted alpha per symbol.
// Quant desks want to see: 'is alpha from one lucky name or broad-based?'
const TICKER_GRID = "36px 120px 80px 120px 110px minmax(140px,1fr)";

function TickerAttributionSection({ rows }) {
  const top = rows.slice(0, 15);
  return (
    <div className="mb-10">
      <SectionHeader title="Performance by ticker" subtitle="Per-ticker contribution to weighted alpha" />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[720px]">
        <div
          className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
          style={{ gridTemplateColumns: TICKER_GRID }}
        >
          <span className="text-right">#</span>
          <span>Ticker</span>
          <span className="tabular-nums text-right">Trades</span>
          <span className="tabular-nums text-right">Buy / Sell mix</span>
          <span className="tabular-nums text-right">Hit rate</span>
          <span className="tabular-nums text-right">vs SPY</span>
        </div>
        <div className="divide-y divide-stroke_soft">
          {top.map((r, i) => {
            const alpha = r.tickerAlpha;
            return (
              <button
                key={r.ticker}
                onClick={() => navigate(`/ticker/${r.ticker}`)}
                className="w-full grid gap-3 px-4 py-[10px] items-center text-left text-small even:bg-[lch(95.5%_0_282)] hover:bg-muted/70"
                style={{ gridTemplateColumns: TICKER_GRID }}
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <div className="flex items-center min-w-0">
                  <TickerLabel ticker={r.ticker} size="sm" />
                </div>
                <span className="tabular-nums text-right text-ink">{r.total}</span>
                <span className="text-mini tabular-nums text-right whitespace-nowrap">
                  <span className="text-buy">{r.buys}</span>
                  <span className="text-ink_faint mx-[2px]">/</span>
                  <span className="text-sell">{r.sells}</span>
                </span>
                <span
                  className={`tabular-nums text-right text-mini ${
                    r.tickerHitRate == null
                      ? "text-ink_faint"
                      : r.tickerHitRate >= 0.7
                        ? "text-buy font-medium"
                        : r.tickerHitRate <= 0.3
                          ? "text-sell font-medium"
                          : "text-ink_muted"
                  }`}
                >
                  {r.tickerHitRate == null ? "—" : `${(r.tickerHitRate * 100).toFixed(0)}% · ${r.wins}/${r.scored}`}
                </span>
                <span
                  className={`tabular-nums text-right font-medium ${alpha == null ? "text-ink_faint" : alpha >= 0 ? "text-buy" : "text-sell"}`}
                >
                  {alpha == null ? "—" : `${alpha >= 0 ? "+" : ""}${alpha.toFixed(0)}%`}
                </span>
              </button>
            );
          })}
        </div>
        </div>
        </div>
      </Card>
    </div>
  );
}

function holdingLabel(dateStr) {
  const then = Date.parse(dateStr);
  if (!Number.isFinite(then)) return "";
  const years = (Date.now() - then) / (365.25 * 86400_000);
  if (years < 1) return `${(years * 12).toFixed(0)}mo`;
  return `${years.toFixed(1)}y`;
}

function isLongHold(dateStr) {
  const then = Date.parse(dateStr);
  if (!Number.isFinite(then)) return false;
  const years = (Date.now() - then) / (365.25 * 86400_000);
  return years >= 3;
}

// "What drove this alpha" breakdown. Shows the top 8 purchases by absolute
// contribution to the weighted-alpha numerator, plus a headline that states
// how concentrated the excess return really is.
const DRIVER_GRID = "28px 84px minmax(0,1fr) 92px 60px 80px 80px 80px 44px";

function AlphaDriversSection({ drivers }) {
  const top = drivers.slice(0, 8);
  const topShare = top.reduce((s, d) => s + d.share, 0);
  const topTicker = top[0]?.ticker;
  const topTickerShare = top.filter((d) => d.ticker === topTicker).reduce((s, d) => s + d.share, 0);

  const subtitle =
    topTicker && topTickerShare > 50
      ? `${topTickerShare.toFixed(0)}% from ${top.filter((d) => d.ticker === topTicker).length} ${topTicker} buys`
      : `Top ${top.length} positions = ${topShare.toFixed(0)}% of the weighted alpha`;

  return (
    <div className="mb-10">
      <SectionHeader title="What drove this alpha" subtitle={subtitle} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[960px]">
        <div
          className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
          style={{ gridTemplateColumns: DRIVER_GRID }}
        >
          <span className="text-right">#</span>
          <span>Ticker</span>
          <span>Asset</span>
          <span className="tabular-nums text-right">Bought</span>
          <span className="tabular-nums text-right">Held</span>
          <span className="tabular-nums text-right">Size</span>
          <span className="tabular-nums text-right">Return</span>
          <span className="tabular-nums text-right">vs SPY</span>
          <span className="text-right"></span>
        </div>
        <div className="divide-y divide-stroke_soft">
          {top.map((d, i) => {
            const ex = d.excess ?? 0;
            const ret = d.ret ?? 0;
            return (
              <div
                key={d.id}
                className="grid gap-3 px-4 py-[10px] items-center text-small even:bg-[lch(95.5%_0_282)] hover:bg-muted/70"
                style={{ gridTemplateColumns: DRIVER_GRID }}
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <button
                  onClick={() => d.ticker && navigate(`/ticker/${d.ticker}`)}
                  className="text-left hover:text-accent"
                >
                  {d.ticker ? <TickerLabel ticker={d.ticker} size="sm" /> : <span className="text-ink_faint">—</span>}
                </button>
                <span className="text-ink_muted truncate" title={d.asset_name}>
                  {cleanAssetName(d.asset_name)}
                </span>
                <span className="text-right text-ink_muted tabular-nums font-mono">{d.transaction_date}</span>
                <span className="text-right text-ink_muted tabular-nums">{holdingLabel(d.transaction_date)}</span>
                <span className="text-right text-ink tabular-nums">{fmtUSD(d.mid)}</span>
                <span className={`text-right tabular-nums ${ret >= 0 ? "text-buy" : "text-sell"}`}>
                  {ret >= 0 ? "+" : ""}
                  {ret.toFixed(0)}%
                </span>
                <span className={`text-right tabular-nums font-semibold ${ex >= 0 ? "text-buy" : "text-sell"}`}>
                  {ex >= 0 ? "+" : ""}
                  {ex.toFixed(0)}%
                </span>
                <div className="text-right">
                  {d.doc_url && (
                    <a
                      href={d.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-ink_muted hover:text-accent text-mini whitespace-nowrap"
                      title="Open original PDF filing"
                    >
                      PDF&nbsp;↗
                    </a>
                  )}
                </div>
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

// Imaginary portfolio: what this filer would be sitting on today if they held
// every disclosed buy to today's close. Reframes the hold-to-today methodology
// as a feature rather than a caveat — "If Marshall never sold his 2017 NVDA,
// he'd have a $3M tech portfolio today." The math is mid_amount × ret_since.
function ImaginaryPortfolio({ trades }) {
  const data = useMemo(() => {
    const buys = trades.filter((t) => {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      return isBuy && t.ret_since != null && t.excess_since != null && t.amount_range_low != null;
    });
    if (!buys.length) return null;

    let cost = 0,
      value = 0,
      spyValue = 0;
    const byTicker = new Map();
    for (const t of buys) {
      const mid = (t.amount_range_low + t.amount_range_high) / 2;
      const v = mid * (1 + t.ret_since / 100);
      const sv = mid * (1 + (t.ret_since - t.excess_since) / 100);
      cost += mid;
      value += v;
      spyValue += sv;
      if (!byTicker.has(t.ticker)) {
        byTicker.set(t.ticker, {
          ticker: t.ticker,
          asset_name: t.asset_name,
          cost: 0,
          value: 0,
          count: 0,
          firstDate: t.transaction_date,
        });
      }
      const pos = byTicker.get(t.ticker);
      pos.cost += mid;
      pos.value += v;
      pos.count += 1;
      if (t.transaction_date && t.transaction_date < pos.firstDate) pos.firstDate = t.transaction_date;
    }
    const holdings = [...byTicker.values()]
      .map((p) => ({
        ...p,
        gain: p.value - p.cost,
        gainPct: p.cost > 0 ? (p.value / p.cost - 1) * 100 : 0,
        weight: value > 0 ? (p.value / value) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      scoredBuys: buys.length,
      cost,
      value,
      spyValue,
      gain: value - cost,
      gainPct: cost > 0 ? (value / cost - 1) * 100 : 0,
      vsSpy: value - spyValue,
      holdings,
    };
  }, [trades]);

  if (!data) return null;

  const HOLDINGS_GRID = "32px minmax(140px,1fr) 90px 110px 130px 90px 72px";

  return (
    <div className="mb-10">
      <SectionHeader
        title="Imaginary portfolio"
        subtitle="What this portfolio would be worth today if every disclosed buy was held to today's close — no sales, no rebalancing. Positions reported as sold are not deducted."
      />

      <Card className="p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
          <div>
            <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">Portfolio value</div>
            <div className="mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-[-0.012em] leading-none text-ink">
              {fmtUSD(data.value)}
            </div>
            <div className="text-mini text-ink_faint mt-1.5">from {fmtUSD(data.cost)} cost</div>
          </div>
          <div>
            <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">Unrealized gain</div>
            <div
              className={`mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-[-0.012em] leading-none ${data.gain >= 0 ? "text-buy" : "text-sell"}`}
            >
              {data.gain >= 0 ? "+" : ""}
              {fmtUSD(data.gain)}
            </div>
            <div className={`text-mini mt-1.5 ${data.gain >= 0 ? "text-buy" : "text-sell"}`}>
              {data.gainPct >= 0 ? "+" : ""}
              {data.gainPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">vs same-$ SPY</div>
            <div
              className={`mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-[-0.012em] leading-none ${data.vsSpy >= 0 ? "text-buy" : "text-sell"}`}
            >
              {data.vsSpy >= 0 ? "+" : ""}
              {fmtUSD(data.vsSpy)}
            </div>
            <div className="text-mini text-ink_faint mt-1.5">SPY would hold {fmtUSD(data.spyValue)}</div>
          </div>
          <div>
            <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">Positions</div>
            <div className="mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-[-0.012em] leading-none text-ink">
              {data.holdings.length}
            </div>
            <div className="text-mini text-ink_faint mt-1.5">{fmtInt(data.scoredBuys)} buys scored</div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div
              className={`grid gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
              style={{ gridTemplateColumns: HOLDINGS_GRID }}
            >
              <span className="text-right">#</span>
              <span>Position</span>
              <span className="tabular-nums text-right">Since</span>
              <span className="tabular-nums text-right">Cost basis</span>
              <span className="tabular-nums text-right">Value today</span>
              <span className="tabular-nums text-right">Gain</span>
              <span className="tabular-nums text-right">Share of portfolio</span>
            </div>
            <div className="divide-y divide-stroke_soft">
              {data.holdings.slice(0, 15).map((p, i) => (
                <button
                  key={p.ticker}
                  onClick={() => navigate(`/ticker/${p.ticker}`)}
                  className="w-full grid gap-3 px-4 py-[10px] items-center text-left text-small hover:bg-muted/70"
                  style={{ gridTemplateColumns: HOLDINGS_GRID }}
                >
                  <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-[58px] shrink-0">
                      <TickerBadge ticker={p.ticker} size="sm" />
                    </div>
                    <span className="text-ink_muted truncate text-mini" title={p.asset_name}>
                      {cleanAssetName(p.asset_name)}
                    </span>
                  </div>
                  <span className="text-right text-ink_muted tabular-nums font-mono text-mini">{p.firstDate}</span>
                  <span className="text-right tabular-nums text-ink_muted">{fmtUSD(p.cost)}</span>
                  <span className="text-right tabular-nums font-medium text-ink">{fmtUSD(p.value)}</span>
                  <span
                    className={`text-right tabular-nums font-medium ${p.gain >= 0 ? "text-buy" : "text-sell"}`}
                  >
                    {p.gain >= 0 ? "+" : ""}
                    {p.gainPct.toFixed(0)}%
                  </span>
                  <span className="tabular-nums text-right text-ink_muted">{p.weight.toFixed(0)}%</span>
                </button>
              ))}
            </div>
            {data.holdings.length > 15 && (
              <div className="px-4 py-2 border-t border-stroke text-mini text-ink_muted text-center">
                Showing top 15 of {data.holdings.length} positions by value
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

import React, { useMemo } from "react";
import CabinetSpotlight from "../components/CabinetSpotlight";
import LeaderboardRail from "../components/LeaderboardRail";
import ReturnsLeaderboard from "../components/ReturnsLeaderboard";
import LateLeaderboard from "../LateLeaderboard";
import { useQueryState } from "../router";
import TickerBoard from "../TickerBoard";
import { ADMINISTRATIONS, findAdmin, fmtInt, Link, SectionHeader, Segmented } from "../ui";

export default function OverviewPage({ data }) {
  const {
    stats,
    filers,
    tickers,
    scatter,
    trades = [],
    returns = [],
    prices = {},
    adminStats = {},
  } = data;
  const [qs, setQs] = useQueryState(["admin"], { admin: "all" });
  const admin = findAdmin(qs.admin);
  const adminActive = admin.k !== "all";
  const adminStat = adminActive ? adminStats[admin.k] : null;

  // When admin is scoped we rely on server-side pre-aggregates (admin-stats.json).
  // The client-side filter path fails for pre-2024 admins because trades.json is
  // capped at 5,000 recent rows — filtering to Trump I returned empty. Pre-computing
  // everything on the server avoids shipping all 54k rows to the browser.
  const scoped = useMemo(() => {
    if (!adminActive) return { trades, filers, tickers, scatter };
    if (!adminStat) return { trades: [], filers: [], tickers: [], scatter: { filers: [], trades: [] } };

    // topByLate has its own pre-ranked list sorted by late-share-weighted-by-count;
    // topByTrades is the generic "most active" list. Merge by id so LateLeaderboard
    // (which expects filers with `late_filings` + `trade_count`) gets a usable pool.
    const byId = new Map();
    for (const f of adminStat.topByTrades) byId.set(f.id, f);
    for (const f of adminStat.topByLate) byId.set(f.id, { ...byId.get(f.id), ...f });
    const scopedFilers = [...byId.values()];
    const scopedTickers = adminStat.topTickers;

    return {
      trades: [], // scoped-trade iteration no longer needed here
      filers: scopedFilers,
      tickers: scopedTickers,
      scatter: { filers: [], trades: [] },
      lateCount: adminStat.late,
      volume: adminStat.volume,
      tradesCount: adminStat.trades,
      filersCount: adminStat.filers,
      biggestTrade: adminStat.biggestTrade,
    };
  }, [trades, filers, tickers, scatter, admin, adminActive, adminStat]);

  const headline = adminActive
    ? `What is ${admin.label === "Trump I" ? "Trump I's" : admin.label === "Trump II" ? "Trump II's" : admin.label === "Biden" ? "Biden's" : "Obama's"} cohort trading?`
    : "Monitor Congressional stock trades";

  const subline = adminActive
    ? `${fmtInt(scoped.tradesCount)} transactions from ${fmtInt(scoped.filersCount)} officials · ${admin.start.slice(0, 7)} → ${admin.end ? admin.end.slice(0, 7) : "now"}`
    : `${fmtInt(stats?.totalTrades)} transactions from ${fmtInt(stats?.totalFilers)} members of Congress and senior executive branch officials, parsed directly from the Clerk of the House, OGE, and Senate eFD.`;

  return (
    <>
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-[2rem] sm:text-display font-semibold leading-[1.08] tracking-[-0.016em] text-ink mb-4">
            {headline}
          </h1>
          <p className="text-regular text-ink_muted">{subline}</p>
        </div>

        <div className="mt-6">
          <Segmented
            value={admin.k}
            onChange={(k) => setQs({ admin: k })}
            options={ADMINISTRATIONS.map((a) => ({ k: a.k, label: a.short }))}
          />
        </div>

        {/* Leaderboard rail: 5 editorial highlights. Responds to admin scope. */}
        <div className="mt-6">
          <LeaderboardRail
            filers={adminActive ? scoped.filers : filers}
            returns={returns}
            tickers={adminActive ? scoped.tickers : tickers}
            trades={trades}
            prices={prices}
            adminKey={admin.k}
            adminStat={adminStat}
          />
        </div>
      </section>

      {/* Cabinet spotlight: executive-branch activity under the current admin */}
      {!adminActive && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
          <CabinetSpotlight filers={filers} trades={trades} />
        </section>
      )}

      {returns && returns.length > 0 && !adminActive && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
          <SectionHeader
            title="Biggest outperformers"
            subtitle="Dollar-weighted cumulative excess return vs SPY from trade date to today. Large numbers are long holds on big winners, not annualized skill."
            right={
              <Link to="/filers?sort=alpha" className="text-small no-underline hover:no-underline">
                See all →
              </Link>
            }
          />
          <ReturnsLeaderboard returns={returns} />
        </section>
      )}

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader
            title="Most late filings"
            right={
              <Link
                to={`/filers?sort=late${adminActive ? `&admin=${admin.k}` : ""}`}
                className="text-small no-underline hover:no-underline"
              >
                See all →
              </Link>
            }
          />
          <LateLeaderboard filers={adminActive ? scoped.filers : filers} />
        </div>
        <div>
          <SectionHeader
            title="Most traded tickers"
            right={
              <Link
                to={`/tickers${adminActive ? `?admin=${admin.k}` : ""}`}
                className="text-small no-underline hover:no-underline"
              >
                See all →
              </Link>
            }
          />
          <TickerBoard tickers={(adminActive ? scoped.tickers : tickers).slice(0, 15)} prices={prices} />
        </div>
      </section>
    </>
  );
}

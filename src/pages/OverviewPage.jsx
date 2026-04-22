import React from "react";
import CabinetSpotlight from "../components/CabinetSpotlight";
import LeaderboardRail from "../components/LeaderboardRail";
import ReturnsLeaderboard from "../components/ReturnsLeaderboard";
import LateLeaderboard from "../LateLeaderboard";
import TickerBoard from "../TickerBoard";
import { fmtInt, Link, SectionHeader } from "../ui";

export default function OverviewPage({ data }) {
  const { stats, filers, tickers, trades = [], returns = [], prices = {} } = data;

  const headline = "Monitor every stock trade Congress makes";
  const subline = `${fmtInt(stats?.totalTrades)} transactions from ${fmtInt(stats?.totalFilers)} members of Congress and senior executive branch officials, parsed directly from the Clerk of the House, OGE, and Senate eFD.`;

  return (
    <>
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-[2rem] sm:text-display font-semibold leading-[1.08] tracking-[-0.016em] text-ink mb-4">
            {headline}
          </h1>
          <p className="text-regular text-ink_muted">{subline}</p>
        </div>

        <div className="mt-8">
          <LeaderboardRail filers={filers} returns={returns} tickers={tickers} trades={trades} prices={prices} />
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <CabinetSpotlight filers={filers} trades={trades} />
      </section>

      {returns && returns.length > 0 && (
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
              <Link to="/filers?sort=late" className="text-small no-underline hover:no-underline">
                See all →
              </Link>
            }
          />
          <LateLeaderboard filers={filers} />
        </div>
        <div>
          <SectionHeader
            title="Most traded tickers"
            right={
              <Link to="/tickers" className="text-small no-underline hover:no-underline">
                See all →
              </Link>
            }
          />
          <TickerBoard tickers={tickers.slice(0, 15)} prices={prices} />
        </div>
      </section>
    </>
  );
}

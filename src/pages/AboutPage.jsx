import React from "react";
import { Card, fmtInt, Link } from "../ui";

const STEPS = [
  {
    title: "The STOCK Act",
    summary: "Why this data exists",
    body: `The Ethics in Government Act of 1978 created public financial disclosure requirements for senior federal officials. The Stop Trading on Congressional Knowledge Act of 2012 ("STOCK Act") extended those rules to periodic transaction reporting, requiring officials to disclose individual stock trades over $1,000 within days, not just annually. The law covers both Congress and the executive branch.`,
  },
  {
    title: "The 45-day deadline",
    summary: "When trades must be disclosed",
    body: `House and Senate members must file a Periodic Transaction Report ("PTR") within 30 days of being notified of a trade, and no later than 45 days after the transaction itself. The 45-day mark is the hard backstop. Anything filed beyond it counts as a late filing.`,
  },
  {
    title: "The 278-T report",
    summary: "The executive branch equivalent",
    body: `Senior executive branch officials file OGE Form 278-T for every reportable transaction over $1,000. Same 30/45-day window. Unlike congressional PTRs, 278-T filings are archived at the U.S. Office of Government Ethics instead of the Clerk of the House.`,
  },
  {
    title: "Extensions",
    summary: "The narrow exceptions",
    body: `Filers can request an extension from their ethics committee (45 days, renewable once to 90 days total) for hardship. Congressional extensions are tracked by the Clerk; executive branch extensions show up in OGE records.`,
  },
  {
    title: "Late filings",
    summary: "What late means here",
    body: `Any PTR / 278-T filed more than 45 days after the transaction (without an approved extension) is late. The STOCK Act sets a $200 flat penalty per late filing, often waived. The far bigger penalty is the public-record flag, which is what this dataset exposes.`,
  },
  {
    title: "Accountability",
    summary: "What this data is for",
    body: `Individual disclosures become searchable when aggregated. You can see who routinely files late, which tickers move with which committees, and whether disclosed holdings reconcile with public statements. This is a tool for journalists, researchers, and interested citizens. Not investment advice.`,
  },
];

export default function AboutPage({ data }) {
  const stats = data.stats;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="max-w-3xl">
        <h1 className="text-display font-semibold leading-[1.08] tracking-[-0.016em] text-ink mb-4">About the data</h1>
        <p className="text-regular text-ink_muted">
          An open dataset that parses congressional and executive branch financial disclosures into a searchable,
          sortable, visual format. Every transaction links back to the original filing PDF so any claim on this site can
          be verified against the source document.
        </p>
        {stats?.generatedAt && (
          <div className="mt-3 text-mini text-ink_muted flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[6px] h-[6px] rounded-full bg-buy animate-pulse" />
              Last updated {stats.generatedAt.slice(0, 10)}
            </span>
            <span className="text-ink_faint">·</span>
            <span>
              Latest filing <span className="font-mono text-ink">{stats.dateRange?.to}</span>
            </span>
          </div>
        )}
        {/* Anchor nav — three jump-links to help people skim the page */}
        <nav className="mt-6 flex flex-wrap items-center gap-2 text-mini">
          <a
            href="#law"
            className="px-2.5 h-7 inline-flex items-center border border-stroke rounded-md bg-panel text-ink_muted hover:text-ink hover:border-ink_faint"
          >
            The law
          </a>
          <a
            href="#sources"
            className="px-2.5 h-7 inline-flex items-center border border-stroke rounded-md bg-panel text-ink_muted hover:text-ink hover:border-ink_faint"
          >
            Data sources
          </a>
          <a
            href="#methodology"
            className="px-2.5 h-7 inline-flex items-center border border-stroke rounded-md bg-panel text-ink_muted hover:text-ink hover:border-ink_faint"
          >
            Methodology caveats
          </a>
        </nav>
      </div>

      <div id="law" className="mt-12 max-w-3xl scroll-mt-20">
        <h2 className="text-large font-semibold text-ink mb-1">The law and the deadlines</h2>
        <p className="text-small text-ink_muted">
          What the STOCK Act requires, how disclosure windows work, and what "late" means when you see that flag on a
          trade.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {STEPS.map((s, i) => (
          <Card key={s.title} className="p-5">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-mini font-medium flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <div>
                <div className="text-regular font-semibold text-ink">{s.title}</div>
                <div className="text-mini text-ink_muted">{s.summary}</div>
              </div>
            </div>
            <p className="text-small text-ink_secondary leading-[1.5]">{s.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-16 max-w-3xl text-small text-ink_muted">
        <p>
          For informational and journalism purposes only. Not investment advice. Dataset licensed for open use. Source
          code on{" "}
          <a
            href="https://github.com/kadoa-org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
          . Found a bug? File an issue or reach out via the{" "}
          <Link to="/" className="underline">
            home page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function SourceRow({ label, detail, url, note }) {
  return (
    <div className="px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <div className="min-w-[220px]">
        <div className="text-small font-medium text-ink">{label}</div>
        <div className="text-mini text-ink_muted">{detail}</div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-small text-accent hover:underline truncate max-w-[320px]"
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
      <div className="text-mini text-ink_muted ml-auto max-w-[260px] text-right">{note}</div>
    </div>
  );
}

function CaveatRow({ label, detail }) {
  return (
    <div className="px-4 py-3">
      <div className="text-small font-medium text-ink">{label}</div>
      <div className="text-small text-ink_muted mt-0.5">{detail}</div>
    </div>
  );
}

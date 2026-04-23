import React from "react";
import { fmtInt, SectionHeader } from "../ui";

// The disclosure-lag panel: median days-to-file, late share, and a bucketed
// histogram. Framing: "the data is stale by design — here's how stale."
// Turns the Reddit critique ("already priced in") into the core narrative.
export default function DisclosureLag({ disclosureLag }) {
  if (!disclosureLag?.buckets?.length) return null;

  const { medianDaysToFile, p90DaysToFile, tradesWithLag, lateCount, buckets } = disclosureLag;
  const latePct = tradesWithLag > 0 ? (lateCount / tradesWithLag) * 100 : 0;
  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
      <SectionHeader
        title="The disclosure gap"
        subtitle="The STOCK Act gives filers 45 days. Here's how long they actually take."
      />
      <div className="border border-stroke rounded-md bg-panel p-5">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
          <div className="grid grid-cols-3 gap-x-6 lg:min-w-[360px]">
            <StatBlock
              label="Median lag"
              value={`${medianDaysToFile ?? "—"}d`}
              hint="Half of trades take longer than this to be disclosed."
            />
            <StatBlock
              label="90th percentile"
              value={`${p90DaysToFile ?? "—"}d`}
              hint="1 in 10 trades takes at least this long."
              tone={p90DaysToFile && p90DaysToFile > 45 ? "warn" : "neutral"}
            />
            <StatBlock
              label="Filed late"
              value={`${latePct.toFixed(0)}%`}
              hint={`${fmtInt(lateCount)} of ${fmtInt(tradesWithLag)} trades disclosed after the 45-day deadline.`}
              tone="warn"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-mini text-ink_muted mb-2.5 font-medium">
              Days from transaction to disclosure
            </div>
            <div className="space-y-1.5">
              {buckets.map((b) => {
                const pct = tradesWithLag > 0 ? (b.count / tradesWithLag) * 100 : 0;
                const width = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
                return (
                  <div key={b.key} className="grid grid-cols-[120px_1fr_72px] items-center gap-3">
                    <span className={`text-mini tabular-nums ${b.late ? "text-warn" : "text-ink_muted"}`}>
                      {b.label}
                    </span>
                    <div className="h-[10px] rounded-sm bg-muted/60 overflow-hidden">
                      <div
                        className={`h-full ${b.late ? "bg-warn/70" : "bg-accent/70"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="text-mini tabular-nums text-ink_muted text-right">
                      {fmtInt(b.count)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-5 text-small text-ink_muted leading-[1.5] max-w-3xl">
          Any copy-trading strategy fights this lag. The interesting signal isn't{" "}
          <em>what</em> members hold — it's <em>who</em> discloses late, and how the pattern shifts across administrations
          and chambers.
        </p>
      </div>
    </section>
  );
}

function StatBlock({ label, value, hint, tone = "neutral" }) {
  const valueCls = tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div>
      <div className="text-mini font-medium text-ink_muted uppercase tracking-[0.06em]">{label}</div>
      <div className={`mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-[-0.012em] leading-none ${valueCls}`}>
        {value}
      </div>
      <div className="text-mini text-ink_faint mt-2 leading-[1.4]">{hint}</div>
    </div>
  );
}

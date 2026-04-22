import React, { useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import { useQueryState } from "../router";
import TradesTable from "../TradesTable";
import { fmtInt, SectionHeader } from "../ui";

const FILTER_KEYS = ["q", "source", "type", "size", "late", "party", "state"];
const QUERY_DEFAULTS = {
  q: "",
  source: "all",
  type: "all",
  size: "all",
  late: "all",
  party: "all",
  state: "all",
};

// Adapt URL query state to FilterBar's filter object (which uses "search" not "q")
function toFilters(qs) {
  return {
    ...defaultFilters,
    search: qs.q,
    source: qs.source,
    type: qs.type,
    size: qs.size,
    late: qs.late,
    party: qs.party,
    state: qs.state,
  };
}

export default function TradesPage({ data }) {
  const { trades = [], filersById } = data;
  const [qs, setQs] = useQueryState(FILTER_KEYS, QUERY_DEFAULTS);
  const [sortCol, setSortCol] = useState({ key: "filing_date", dir: "desc" });

  const filters = toFilters(qs);
  const setFilters = (updater) => {
    setQs((prev) => {
      const merged = typeof updater === "function" ? updater(toFilters(prev)) : { ...toFilters(prev), ...updater };
      return {
        q: merged.search,
        source: merged.source,
        type: merged.type,
        size: merged.size,
        late: merged.late,
        party: merged.party,
        state: merged.state,
      };
    });
  };

  const filtered = useMemo(() => {
    const rows = applyFilters(trades, filters);
    const { key, dir } = sortCol;
    const mul = dir === "asc" ? 1 : -1;
    const valued = (t) => {
      if (key === "amount") return t.amount_range_low != null ? (t.amount_range_low + t.amount_range_high) / 2 : -1;
      if (key === "ret_since" || key === "excess_since" || key === "days_to_file") {
        const v = t[key];
        return v == null ? (dir === "asc" ? Infinity : -Infinity) : v;
      }
      return t[key] ?? "";
    };
    return [...rows].sort((a, b) => {
      const av = valued(a);
      const bv = valued(b);
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }, [trades, filters, sortCol]);

  const activeChips = [];
  for (const k of FILTER_KEYS) {
    if (qs[k] && qs[k] !== QUERY_DEFAULTS[k]) {
      const label = {
        q: "Search",
        source: "Source",
        type: "Type",
        size: "Size",
        late: "Late",
        party: "Party",
        state: "State",
      }[k];
      activeChips.push({ k, label, value: qs[k] });
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader title="All trades" subtitle={`${fmtInt(filtered.length)} of ${fmtInt(trades.length)}`} />

      <div className="mb-3">
        <FilterBar filters={filters} setFilters={setFilters} trades={trades} />
      </div>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-small text-ink_muted">Active:</span>
          {activeChips.map((c) => (
            <button
              key={c.k}
              onClick={() => setQs({ [c.k]: QUERY_DEFAULTS[c.k] })}
              className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-muted text-small text-ink hover:bg-hover"
            >
              <span className="text-ink_muted">{c.label}:</span>
              <span className="font-medium">{c.value}</span>
              <span className="text-ink_faint ml-1">×</span>
            </button>
          ))}
          <button
            onClick={() => setQs({ ...QUERY_DEFAULTS })}
            className="text-small text-ink_muted hover:text-ink ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      <TradesTable trades={filtered} tall sortCol={sortCol} onSort={setSortCol} filersById={filersById} />
    </div>
  );
}

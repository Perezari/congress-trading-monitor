# Congress Trading Monitor

**Live demo: [congress.kadoa.com](https://congress.kadoa.com/)**

Interactive dashboard and open dataset of every stock trade disclosed by U.S. Senators, Representatives, and senior executive branch officials under the STOCK Act.

Three official public sources are aggregated into one unified, searchable dataset: the House Clerk's Financial Disclosure portal, the Senate eFD system, and the Office of Government Ethics (OGE) for the executive branch.

## What's in the data?

- **54,000+ disclosed transactions** from 2012 to present
- **380+ filers** across House, Senate, and executive branch (incl. cabinet officials)
- **$5B+ in estimated notional volume** across stocks, bonds, ETFs, crypto, and other assets
- Transaction-level detail: ticker, asset name, buy/sell, amount range, disclosure latency
- Late-filing flags where the 45-day STOCK Act deadline was missed
- Administration tagging (Obama, Trump I, Biden, Trump II) for cross-term comparisons
- Per-filer and per-ticker drill-downs with return computations against a price join

## Quick start

```bash
bun install && bun run dev
```

Open [http://localhost:5183](http://localhost:5183)

## Features

- **Overview dashboard** with global KPIs, alpha index, cabinet spotlight, and leaderboards
- **Filers page** ranked by activity, volume, late-filing rate, and buy/sell split
- **Tickers page** showing which securities attract the most political money
- **Filter bar** by administration, branch, chamber, party, source, and date range
- **Per-filer and per-ticker pages** with personal timelines and return overlays
- **Command palette** (Cmd+K) for quick navigation between filers and tickers

## Data

All data is served as static JSON in `public/data/` and loaded client-side. No backend required.

| File | Description |
|------|-------------|
| `public/data/stats.json` | Global KPIs (totals, source breakdown, date range) |
| `public/data/trades.json` | All parsed transactions |
| `public/data/filers.json` | Politicians / officials with biographical metadata |
| `public/data/tickers.json` | Aggregated per-ticker stats |
| `public/data/returns.json` | Per-filer excess-return computations |
| `public/data/prices.json` | Price series used for return calculations |
| `public/data/scatter.json` | Hero scatter coordinates (filer activity vs. volume) |
| `public/data/timeseries.json` | Monthly trade counts by source |
| `public/data/alpha-index.json` | Alphabetical filer index for navigation |
| `public/data/admin-stats.json` | Administration-level aggregates |
| `public/data/filer/{id}.json` | Per-filer drill-down data |
| `public/data/ticker/{symbol}.json` | Per-ticker drill-down data |

## Data sources

All three sources are public records under the Ethics in Government Act and the STOCK Act.

- **House Clerk** -- [disclosures-clerk.house.gov/FinancialDisclosure](https://disclosures-clerk.house.gov/FinancialDisclosure). Annual ZIPs with XML index + individual PTR PDFs. Fully bulk-downloadable.
- **Senate eFD** -- [efdsearch.senate.gov](https://efdsearch.senate.gov). HTML reports (post-2015) + PDF scans. Requires session + CSRF + agreement POST.
- **OGE Executive Branch** -- [oge.gov](https://www.oge.gov/web/oge.nsf/Officials%20Individual%20Disclosures%20Search%20Collection). Form 278-T (STOCK Act equivalent for the executive branch). PAS officials publish PDFs directly, most other entries require a Form 201 request.

We use [kadoa.com](https://kadoa.com) to collect, parse, and normalize the data. Need the full historical dataset with continuous updates? [Get in touch](https://www.kadoa.com/contact/sales).

## Legal note

The Senate eFD is governed by 5 U.S.C. app. § 105(c), which prohibits use of filings for "any commercial purpose, other than by news and communications media for dissemination to the general public." Civil penalty up to $10,000. This project is built for journalism and civic transparency.

## What's next

- LLM-grounded ticker resolver for higher coverage on free-text asset names
- OGE Form 201 request workflow for request-only entries (~80% of OGE filings)
- Senate pre-2015 paper-filing PDFs (currently skipped)
- Net worth and portfolio derivation from annual 278 reports

## License

MIT -- see [LICENSE](LICENSE).

The disclosure data is sourced from public filings and provided for research and educational purposes.

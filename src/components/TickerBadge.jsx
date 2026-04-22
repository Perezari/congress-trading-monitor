import React from "react";

// Self-contained ticker pill: saturated hue + white glyph + 4px radius.
// Follows Linear's project-tag pattern — one coherent chip rather than
// a monogram square sitting next to duplicate ticker text.
// The hue is stable per ticker (hash-based) so NVDA always reads as NVDA.
const TINTS = [
  "#4268c9", // blue
  "#2f7a52", // emerald
  "#b86a1f", // amber
  "#6a46b8", // violet
  "#b03333", // red
  "#287b7b", // teal
  "#a17b1a", // yellow
  "#4a52b8", // indigo
  "#b85187", // pink
  "#486a85", // slate
];

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function tickerTint(ticker) {
  if (!ticker) return "#9aa0ac";
  return TINTS[hashCode(ticker) % TINTS.length];
}

// Size variants:
//   sm  → dense tables, sidebar chips
//   md  → default for leaderboards, widely-held rails
//   lg  → detail-page hero
const SIZES = {
  sm: { height: 18, px: 6, font: 10.5, radius: 4 },
  md: { height: 22, px: 8, font: 12, radius: 4 },
  lg: { height: 32, px: 12, font: 16, radius: 5 },
};

export function TickerBadge({ ticker, size = "md" }) {
  const bg = tickerTint(ticker);
  const s = SIZES[size] || SIZES.md;
  const text = ticker || "—";
  return (
    <div
      className="inline-flex items-center justify-center shrink-0 text-white font-mono"
      style={{
        height: s.height,
        paddingLeft: s.px,
        paddingRight: s.px,
        backgroundColor: bg,
        fontSize: s.font,
        fontWeight: 600,
        letterSpacing: "0.02em",
        lineHeight: 1,
        borderRadius: s.radius,
      }}
    >
      {text}
    </div>
  );
}

// Back-compat alias. Previously rendered [monogram] + ticker text;
// now the pill carries the ticker itself, so this is just the badge.
export const TickerLabel = TickerBadge;

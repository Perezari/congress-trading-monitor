// Static ticker -> sector map. Lives in src/ (NOT public/data/) on purpose:
// the daily sync workflow runs `rm -rf public/data`, so a file there would be
// wiped every morning. Covers the highest-volume tickers (~90% of disclosed
// notional); the long tail falls through to "other".

export const SECTORS = [
  { key: "tech", label: "Information Technology", color: "#6366f1" },
  { key: "financials", label: "Financials", color: "#0ea5e9" },
  { key: "health", label: "Health Care", color: "#10b981" },
  { key: "communication", label: "Communication Services", color: "#8b5cf6" },
  { key: "discretionary", label: "Consumer Discretionary", color: "#f59e0b" },
  { key: "staples", label: "Consumer Staples", color: "#14b8a6" },
  { key: "industrials", label: "Industrials", color: "#64748b" },
  { key: "energy", label: "Energy", color: "#ef4444" },
  { key: "materials", label: "Materials", color: "#d97706" },
  { key: "utilities", label: "Utilities", color: "#eab308" },
  { key: "realestate", label: "Real Estate", color: "#a855f7" },
  { key: "etf", label: "ETFs & Funds", color: "#3b82f6" },
  { key: "crypto", label: "Crypto", color: "#f97316" },
  { key: "fixedincome", label: "Fixed Income", color: "#94a3b8" },
  { key: "other", label: "Other", color: "#cbd5e1" },
];

export const SECTOR_LABEL = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]));
export const SECTOR_COLOR = Object.fromEntries(SECTORS.map((s) => [s.key, s.color]));

// Grouped by sector for readability; flattened into TICKER_SECTOR below.
const BY_SECTOR = {
  tech: ["MSFT","INTC","AAPL","NVDA","AVGO","CSCO","CRM","QCOM","ORCL","ADBE","PANW","TXN","NOW","TSM","TEAM","AMD","CRWD","IBM","AMAT","INTU","MU","IFNNY","LRCX","PLTR","ACN","ANET","ZBRA","TTD","DELL","HPQ","SNOW","NXPI","ADI","KLAC","MCHP","ON","SMCI","WDAY","SNPS","CDNS","FTNT","ASML"],
  financials: ["BRK.B","JPM","GS","WFC","PYPL","V","BAC","MA","AXP","UBS","BLK","BX","NDAQ","BXS","SQ","PGR","WTW","SSB","CB","HSBC","BBVA","SCHW","MS","FISV","FIS","SPGI","USB","C","COF","PNC","TFC","MET","AIG","ICE","CME","MCO","TRV","ALL","AFL","BK","FITB","HBAN","KEY","RF","SOFI"],
  health: ["UNH","LLY","JNJ","ABBV","ABT","MDT","DHR","PFE","MRK","TMO","CVS","AMGN","BMY","SYK","DXCM","LH","ZTS","CI","TDOC","RHHBY","MRNA","GILD","REGN","VRTX","ISRG","BIIB","ELV","HUM","HCA","BSX","BDX","EW","IDXX","IQV","DVA"],
  communication: ["GOOGL","GOOG","META","FB","NFLX","DIS","VZ","T","CMCSA","CHTR","FWONK","LBRDK","ATVI","LSXMK","CTL","CHL","TMUS","SNAP","PINS","RBLX","EA","TTWO","WBD","PARA","OMC","IPG","MTCH","LUMN"],
  discretionary: ["AMZN","TSLA","HD","MCD","SBUX","NKE","LOW","TJX","CMG","ABNB","UBER","F","HOG","BABA","W","LEN","GM","BKNG","MAR","ORLY","ROST","YUM","DHI","RCL","CCL","LVS","GME","EBAY","ETSY","DPZ","LULU","APTV","NCLH","DRI","EXPE","HLT"],
  staples: ["WMT","COST","PG","KO","PEP","PM","MO","KMB","GIS","KHC","CLX","KR","TGT","DG","DEO","NSRGY","EL","CL","MDLZ","STZ","SYY","HSY","K","DLTR","ADM","KDP","MNST","CHD","TAP"],
  industrials: ["MMM","BA","FDX","GE","CAT","DE","UPS","HON","RTX","LMT","UNP","ETN","EMR","GNRC","AAL","LUV","NOC","GD","CSX","NSC","ITW","PH","ADP","WM","RSG","DAL","UAL","CARR","OTIS","PCAR","CMI","ROK","DOV","IR"],
  energy: ["XOM","CVX","ET","EPD","MPLX","PAA","PXD","VLO","SLB","WMB","DVN","COP","LBRT","AM","SHLX","USAC","NGL","PBFX","ENLC","ENBL","MMP","GEL","OKE","KMI","PSX","MPC","HAL","FANG","APA","HES","OXY","EOG","WES","MRO","BKR","CTRA"],
  materials: ["LIN","CLF","X","RIO","NUE","FCX","DD","DOW","APD","SHW","ECL","NEM","VMC","MLM","ALB","CTVA","PPG","IFF","STLD"],
  utilities: ["NEE","DUK","SO","D","AEP","EXC","SRE","XEL","ED","PEG","WEC","ES","AWK","PCG","EIX"],
  realestate: ["SPG","O","AMT","PLD","CCI","PSA","EQIX","WELL","DLR","AVB","SBAC","VICI","EQR"],
  etf: ["SPY","DGRO","VIG","EFA","IWN","TNA","VOO","QQQ","VTI","IVV","SCHD","GLD","ARKK","IWM","VEA","VGT","XLK","XLF","XLE","VYM","DIA","VNQ","AGG","BND","TLT","JEPI","SCHX","IJR","IWF","VUG"],
  crypto: ["BITB","GBTC","IBIT","FBTC","ETHE","ARKB","MSTR","BITO"],
  fixedincome: ["US-TBILL","US-TNOTE","US-TBOND","US-TIPS"],
};

export const TICKER_SECTOR = {};
for (const [sector, list] of Object.entries(BY_SECTOR)) {
  for (const t of list) TICKER_SECTOR[t] = sector;
}

export function sectorOf(ticker) {
  return TICKER_SECTOR[ticker] || "other";
}

/** USDC has 6 decimals. Format base units → "$1,284.91" style. */
export function fmtUsdc(base: bigint | string, opts: { decimals?: number; sign?: boolean } = {}): string {
  const v = typeof base === "string" ? BigInt(base) : base;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / 1_000_000n;
  const dec = opts.decimals ?? 2;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0").slice(0, dec);
  const wholeStr = whole.toLocaleString("en-US");
  return `${neg ? "-" : opts.sign ? "+" : ""}$${wholeStr}${dec > 0 ? "." + frac : ""}`;
}

export function shortAddr(a?: string | null): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** price-per-block (USDC base units / 1000 impressions) → "$0.0006 / impression". */
export function perImpression(pricePerBlock: bigint | string): string {
  const v = typeof pricePerBlock === "string" ? BigInt(pricePerBlock) : pricePerBlock;
  const perImpr = v / 1000n; // base units per impression
  return fmtUsdc(perImpr, { decimals: 4 });
}

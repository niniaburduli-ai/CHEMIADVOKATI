/** Pure pricing math — no server-only deps, safe to import from client components. */
export function effectivePriceMinor(p: { priceMinor: number; discountPriceMinor: number }): number {
  return p.discountPriceMinor > 0 && p.discountPriceMinor < p.priceMinor ? p.discountPriceMinor : p.priceMinor
}

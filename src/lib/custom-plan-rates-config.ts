/** Client-safe custom-plan-builder constants + pure pricing math (no DB import). */

export const STEP_QUANTITIES = [10, 50, 100, 200, 300] as const
export type StepQuantity = (typeof STEP_QUANTITIES)[number]

export const CUSTOM_SERVICES = ["consultations", "docTemplates", "docGeneration", "docReview"] as const
export type CustomService = (typeof CUSTOM_SERVICES)[number]

/** priceMinor (GEL tetri) per step index, aligned with STEP_QUANTITIES. Always length 5. */
export type CustomPlanRatesData = Record<CustomService, number[]>

/** Selected quantity per service: 0 (excluded) or one of STEP_QUANTITIES. */
export type CustomSelection = Record<CustomService, number>

/**
 * Seed prices (GEL tetri). Real per-unit AI cost is negligible (cheap OpenRouter
 * calls) — these are priced well above cost, with volume discount per step and
 * a 9 GEL floor on any single-service purchase to stay safely above Flitt's
 * per-transaction fee. See the design spec for the full reasoning.
 */
export const DEFAULT_CUSTOM_RATES: CustomPlanRatesData = {
  consultations: [900, 2900, 4900, 7900, 9900],
  docTemplates: [900, 1900, 2900, 4500, 5900],
  docGeneration: [1200, 3900, 6500, 10900, 13900],
  docReview: [1500, 4900, 7900, 12900, 16900],
}

/** 0 per cell = no discount for that service/step. */
export const DEFAULT_CUSTOM_DISCOUNT_RATES: CustomPlanRatesData = {
  consultations: [0, 0, 0, 0, 0],
  docTemplates: [0, 0, 0, 0, 0],
  docGeneration: [0, 0, 0, 0, 0],
  docReview: [0, 0, 0, 0, 0],
}

/** Per-cell effective price — the discount when set and lower than the regular price, else the regular price. */
export function effectiveCustomRates(
  rates: CustomPlanRatesData,
  discountRates: CustomPlanRatesData
): CustomPlanRatesData {
  const out = {} as CustomPlanRatesData
  for (const service of CUSTOM_SERVICES) {
    out[service] = rates[service].map((price, i) => {
      const discount = discountRates[service][i]
      return discount > 0 && discount < price ? discount : price
    })
  }
  return out
}

/** priceMinor for a quantity: 0 for the "not included" quantity, null if `qty` isn't a valid step. */
export function priceForQuantity(
  rates: CustomPlanRatesData,
  service: CustomService,
  qty: number
): number | null {
  if (qty === 0) return 0
  const idx = STEP_QUANTITIES.indexOf(qty as StepQuantity)
  if (idx === -1) return null
  return rates[service][idx]
}

/**
 * Total priceMinor for a selection, or null if any quantity is invalid or
 * nothing at all is selected (a checkout needs at least one service > 0).
 */
export function computeCustomTotal(
  rates: CustomPlanRatesData,
  selection: CustomSelection
): number | null {
  let total = 0
  let anySelected = false
  for (const service of CUSTOM_SERVICES) {
    const qty = selection[service] ?? 0
    const price = priceForQuantity(rates, service, qty)
    if (price === null) return null
    if (qty > 0) anySelected = true
    total += price
  }
  return anySelected ? total : null
}

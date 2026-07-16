import { dbConnect } from "@/lib/db"
import { CustomPlanRates, type CustomPlanRatesDoc } from "@/lib/models/CustomPlanRates"
import { DEFAULT_CUSTOM_RATES, DEFAULT_CUSTOM_DISCOUNT_RATES, type CustomPlanRatesData } from "@/lib/custom-plan-rates-config"

export {
  STEP_QUANTITIES,
  CUSTOM_SERVICES,
  DEFAULT_CUSTOM_RATES,
  DEFAULT_CUSTOM_DISCOUNT_RATES,
  priceForQuantity,
  computeCustomTotal,
  effectiveCustomRates,
} from "@/lib/custom-plan-rates-config"
export type {
  CustomService,
  CustomPlanRatesData,
  CustomSelection,
} from "@/lib/custom-plan-rates-config"

const isValid5 = (v: unknown): v is number[] => Array.isArray(v) && v.length === 5

/** Read the singleton regular + discount rate tables in one query, falling back to defaults on any DB failure. */
export async function getCustomPlanRatesFull(): Promise<{
  rates: CustomPlanRatesData
  discountRates: CustomPlanRatesData
}> {
  try {
    await dbConnect()
    const doc = await CustomPlanRates.findOne().lean<CustomPlanRatesDoc>()
    if (!doc) return { rates: { ...DEFAULT_CUSTOM_RATES }, discountRates: { ...DEFAULT_CUSTOM_DISCOUNT_RATES } }
    return {
      rates: {
        consultations: isValid5(doc.consultations) ? doc.consultations : DEFAULT_CUSTOM_RATES.consultations,
        docTemplates: isValid5(doc.docTemplates) ? doc.docTemplates : DEFAULT_CUSTOM_RATES.docTemplates,
        docGeneration: isValid5(doc.docGeneration) ? doc.docGeneration : DEFAULT_CUSTOM_RATES.docGeneration,
        docReview: isValid5(doc.docReview) ? doc.docReview : DEFAULT_CUSTOM_RATES.docReview,
      },
      discountRates: {
        consultations: isValid5(doc.discountConsultations) ? doc.discountConsultations : DEFAULT_CUSTOM_DISCOUNT_RATES.consultations,
        docTemplates: isValid5(doc.discountDocTemplates) ? doc.discountDocTemplates : DEFAULT_CUSTOM_DISCOUNT_RATES.docTemplates,
        docGeneration: isValid5(doc.discountDocGeneration) ? doc.discountDocGeneration : DEFAULT_CUSTOM_DISCOUNT_RATES.docGeneration,
        docReview: isValid5(doc.discountDocReview) ? doc.discountDocReview : DEFAULT_CUSTOM_DISCOUNT_RATES.docReview,
      },
    }
  } catch (err) {
    console.error("[custom-plan-rates] getCustomPlanRatesFull DB read failed, serving defaults:", err)
    return { rates: { ...DEFAULT_CUSTOM_RATES }, discountRates: { ...DEFAULT_CUSTOM_DISCOUNT_RATES } }
  }
}

/** Read the singleton regular rate table, falling back to defaults on any DB failure. */
export async function getCustomPlanRates(): Promise<CustomPlanRatesData> {
  return (await getCustomPlanRatesFull()).rates
}

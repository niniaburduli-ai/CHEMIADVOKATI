import { dbConnect } from "@/lib/db"
import { Plan, type PlanDoc } from "@/lib/models/Plan"
import { PLAN_LIMITS } from "@/lib/plans"

/** Plain, serializable plan shape for client components / API responses. */
export type PlanData = {
  id: string
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
}

export type PlanLimits = {
  consultations: number
  docGeneration: number
  docReview: number
  docTemplates: number
}

/** Seed defaults only when a plan is first created. DB is source of truth after that. */
const DEFAULT_PLANS: Omit<PlanData, "id">[] = [
  {
    key: "free", name: "საბაზისო პაკეტი", nameEn: "Basic Plan",
    description: "სცადე როგორ მუშაობს", descriptionEn: "Try how it works",
    priceMinor: 0, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.free.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.free.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.free.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.free.docTemplates,
    features: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["9 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["3 შაბლონის გენერირება"], featuresDocGenerationEn: ["3 template generations"],
    featuresDocReview: ["1 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["1 document review"],
    featuresDocTemplates: ["20 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["20 ready-made template fills"],
    isFree: true, highlighted: false, visible: true, active: true, order: 0,
  },
  {
    key: "standard", name: "სტანდარტული პაკეტი", nameEn: "Standard Plan",
    description: "ყველაზე პოპულარული", descriptionEn: "Most popular",
    priceMinor: 1900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.standard.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.standard.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.standard.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.standard.docTemplates,
    features: ["29 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["29 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["19 შაბლონის გენერირება"], featuresDocGenerationEn: ["19 template generations"],
    featuresDocReview: ["9 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["9 document reviews"],
    featuresDocTemplates: ["50 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["50 ready-made template fills"],
    isFree: false, highlighted: true, visible: true, active: true, order: 1,
  },
  {
    key: "premium", name: "პრემიუმ (ბიზნეს) პაკეტი", nameEn: "Premium (Business) Plan",
    description: "ხშირი მომხმარებლისთვის", descriptionEn: "For frequent users",
    priceMinor: 9900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.premium.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.premium.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.premium.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.premium.docTemplates,
    features: ["199 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["199 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["99 შაბლონის გენერირება"], featuresDocGenerationEn: ["99 template generations"],
    featuresDocReview: ["99 დოკუმენტის/ხელშეკრულების შემოწმება"], featuresDocReviewEn: ["99 document/contract reviews"],
    featuresDocTemplates: ["200 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["200 ready-made template fills"],
    isFree: false, highlighted: false, visible: true, active: true, order: 2,
  },
]

function toData(d: PlanDoc): PlanData {
  // Fall back to DEFAULT_PLANS text when DB doc is missing the field (pre-schema documents).
  const def = DEFAULT_PLANS.find((p) => p.key === d.key)
  const defGen = def?.includeDocGeneration ?? true
  const defRev = def?.includeDocReview ?? true
  const defTpl = def?.includeDocTemplates ?? true
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    nameEn: d.nameEn ?? "",
    description: d.description ?? "",
    descriptionEn: d.descriptionEn ?? "",
    priceMinor: d.priceMinor ?? 0,
    currency: d.currency ?? "GEL",
    period: d.period ?? "month",
    consultations: d.consultations ?? 0,
    includeDocGeneration: d.includeDocGeneration == null ? defGen : d.includeDocGeneration,
    docGeneration: d.docGeneration ?? 0,
    includeDocReview: d.includeDocReview == null ? defRev : d.includeDocReview,
    docReview: d.docReview ?? 0,
    includeDocTemplates: d.includeDocTemplates == null ? defTpl : d.includeDocTemplates,
    docTemplates: d.docTemplates ?? 0,
    features: d.features ?? [],
    featuresEn: d.featuresEn ?? [],
    featuresDocGeneration: d.featuresDocGeneration?.length ? d.featuresDocGeneration : (def?.featuresDocGeneration ?? []),
    featuresDocGenerationEn: d.featuresDocGenerationEn?.length ? d.featuresDocGenerationEn : (def?.featuresDocGenerationEn ?? []),
    featuresDocReview: d.featuresDocReview?.length ? d.featuresDocReview : (def?.featuresDocReview ?? []),
    featuresDocReviewEn: d.featuresDocReviewEn?.length ? d.featuresDocReviewEn : (def?.featuresDocReviewEn ?? []),
    featuresDocTemplates: d.featuresDocTemplates?.length ? d.featuresDocTemplates : (def?.featuresDocTemplates ?? []),
    featuresDocTemplatesEn: d.featuresDocTemplatesEn?.length ? d.featuresDocTemplatesEn : (def?.featuresDocTemplatesEn ?? []),
    isFree: !!d.isFree,
    highlighted: !!d.highlighted,
    visible: d.visible !== false,
    active: d.active !== false,
    order: d.order ?? 0,
  }
}

/**
 * Ensure the collection has at least the default plans. Idempotent, and only
 * ever touches a plan on its FIRST insert — every field is $setOnInsert, so a
 * saved admin edit is never overwritten by a later seed call (this runs on
 * every getPlans(), i.e. every page load).
 */
export async function ensurePlansSeeded(): Promise<void> {
  await dbConnect()
  await Promise.all(
    DEFAULT_PLANS.map((def) =>
      Plan.updateOne(
        { key: def.key },
        { $setOnInsert: def },
        { upsert: true }
      )
    )
  )
}

/** All plans, ordered. Seeds defaults on first call. */
export async function getPlans(): Promise<PlanData[]> {
  try {
    await ensurePlansSeeded()
    const docs = await Plan.find().sort({ order: 1, priceMinor: 1 }).lean<PlanDoc[]>()
    return docs.map(toData)
  } catch (err) {
    // Falls back to hardcoded defaults so the pricing page never breaks, but
    // this means any saved admin edit is invisible until the DB is reachable
    // again — log loudly so that isn't mistaken for a lost save.
    console.error("[plans-db] getPlans DB read failed, serving hardcoded defaults:", err)
    return DEFAULT_PLANS.map((p, i) => ({ ...p, id: `default-${i}` }))
  }
}

/** Plans shown on the public pricing page. */
export async function getVisiblePlans(): Promise<PlanData[]> {
  const plans = await getPlans()
  return plans.filter((p) => p.visible)
}

export async function getPlanByKey(key: string): Promise<PlanData | null> {
  try {
    await ensurePlansSeeded()
    const doc = await Plan.findOne({ key: key.toLowerCase() }).lean<PlanDoc>()
    return doc ? toData(doc) : null
  } catch {
    const def = DEFAULT_PLANS.find((p) => p.key === key)
    return def ? { ...def, id: `default-${key}` } : null
  }
}

/** Monthly quota limits for a plan key, falling back to the free defaults. */
export async function getPlanLimits(key: string): Promise<PlanLimits> {
  const plan = await getPlanByKey(key)
  if (plan) {
    return {
      consultations: plan.consultations,
      docGeneration: plan.includeDocGeneration ? plan.docGeneration : 0,
      docReview: plan.includeDocReview ? plan.docReview : 0,
      docTemplates: plan.includeDocTemplates ? plan.docTemplates : 0,
    }
  }
  const f = PLAN_LIMITS.free
  return { consultations: f.consultations, docGeneration: f.docGeneration, docReview: f.docReview, docTemplates: f.docTemplates }
}

/** Keys of plans a user may subscribe to (paid + active). */
export async function getPayablePlanKeys(): Promise<string[]> {
  const plans = await getPlans()
  return plans.filter((p) => p.active && !p.isFree && p.priceMinor > 0).map((p) => p.key)
}

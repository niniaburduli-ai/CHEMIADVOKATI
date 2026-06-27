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
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
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
}

/** Seed defaults the first time the collection is empty. DB is source of truth after. */
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
    features: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["9 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["3 შაბლონის გენერირება"], featuresDocGenerationEn: ["3 template generations"],
    featuresDocReview: ["1 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["1 document review"],
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
    features: ["29 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["29 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["19 შაბლონის გენერირება"], featuresDocGenerationEn: ["19 template generations"],
    featuresDocReview: ["9 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["9 document reviews"],
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
    features: ["შეუზღუდავი კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["Unlimited AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["შეუზღუდავი შაბლონის გენერირება"], featuresDocGenerationEn: ["Unlimited template generations"],
    featuresDocReview: ["99 დოკუმენტის/ხელშეკრულების შემოწმება"], featuresDocReviewEn: ["99 document/contract reviews"],
    isFree: false, highlighted: false, visible: true, active: true, order: 2,
  },
]

function toData(d: PlanDoc): PlanData {
  // Fall back to DEFAULT_PLANS text when DB doc is missing the field (pre-schema documents).
  const def = DEFAULT_PLANS.find((p) => p.key === d.key)
  const defGen = def?.includeDocGeneration ?? true
  const defRev = def?.includeDocReview ?? true
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
    features: d.features ?? [],
    featuresEn: d.featuresEn ?? [],
    featuresDocGeneration: d.featuresDocGeneration?.length ? d.featuresDocGeneration : (def?.featuresDocGeneration ?? []),
    featuresDocGenerationEn: d.featuresDocGenerationEn?.length ? d.featuresDocGenerationEn : (def?.featuresDocGenerationEn ?? []),
    featuresDocReview: d.featuresDocReview?.length ? d.featuresDocReview : (def?.featuresDocReview ?? []),
    featuresDocReviewEn: d.featuresDocReviewEn?.length ? d.featuresDocReviewEn : (def?.featuresDocReviewEn ?? []),
    isFree: !!d.isFree,
    highlighted: !!d.highlighted,
    visible: d.visible !== false,
    active: d.active !== false,
    order: d.order ?? 0,
  }
}

/** Ensure the collection has at least the default plans. Idempotent. */
export async function ensurePlansSeeded(): Promise<void> {
  await dbConnect()
  // Upsert each default plan: sync content fields always, set toggle/visibility
  // fields only on first creation so admin changes are preserved.
  await Promise.all(
    DEFAULT_PLANS.map((def) =>
      Plan.updateOne(
        { key: def.key },
        {
          $set: {
            name: def.name, nameEn: def.nameEn,
            description: def.description, descriptionEn: def.descriptionEn,
            priceMinor: def.priceMinor,
            consultations: def.consultations,
            includeDocGeneration: def.includeDocGeneration,
            docGeneration: def.docGeneration,
            includeDocReview: def.includeDocReview,
            docReview: def.docReview,
            features: def.features,
            featuresEn: def.featuresEn,
            featuresDocGeneration: def.featuresDocGeneration,
            featuresDocGenerationEn: def.featuresDocGenerationEn,
            featuresDocReview: def.featuresDocReview,
            featuresDocReviewEn: def.featuresDocReviewEn,
          },
          $setOnInsert: {
            isFree: def.isFree,
            highlighted: def.highlighted,
            visible: def.visible,
            active: def.active,
            order: def.order,
          },
        },
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
  } catch {
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
    }
  }
  const f = PLAN_LIMITS.free
  return { consultations: f.consultations, docGeneration: f.docGeneration, docReview: f.docReview }
}

/** Keys of plans a user may subscribe to (paid + active). */
export async function getPayablePlanKeys(): Promise<string[]> {
  const plans = await getPlans()
  return plans.filter((p) => p.active && !p.isFree && p.priceMinor > 0).map((p) => p.key)
}

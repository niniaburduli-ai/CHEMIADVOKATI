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
  docGeneration: number
  docReview: number
  features: string[]
  featuresEn: string[]
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
    key: "free", name: "უფასო", nameEn: "Free",
    description: "სცადე როგორ მუშაობს", descriptionEn: "Try how it works",
    priceMinor: 0, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.free.consultations,
    docGeneration: PLAN_LIMITS.free.docGeneration,
    docReview: PLAN_LIMITS.free.docReview,
    features: ["1 კონსულტაცია თვეში", "კანონმდებლობის დათვალიერება", "საბაზო AI პასუხები"],
    featuresEn: ["1 consultation per month", "Browse legislation", "Basic AI answers"],
    isFree: true, highlighted: false, visible: true, active: true, order: 0,
  },
  {
    key: "standard", name: "სტანდარტი", nameEn: "Standard",
    description: "ყველაზე პოპულარული", descriptionEn: "Most popular",
    priceMinor: 1900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.standard.consultations,
    docGeneration: PLAN_LIMITS.standard.docGeneration,
    docReview: PLAN_LIMITS.standard.docReview,
    features: ["9 კონსულტაცია თვეში", "მუხლების ციტირება", "კონსულტაციების ისტორია", "გაუქმება ნებისმიერ დროს"],
    featuresEn: ["9 consultations per month", "Article citations", "Consultation history", "Cancel anytime"],
    isFree: false, highlighted: true, visible: true, active: true, order: 1,
  },
  {
    key: "premium", name: "პრემიუმი", nameEn: "Premium",
    description: "ხშირი მომხმარებლისთვის", descriptionEn: "For frequent users",
    priceMinor: 9900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.premium.consultations,
    docGeneration: PLAN_LIMITS.premium.docGeneration,
    docReview: PLAN_LIMITS.premium.docReview,
    features: ["ულიმიტო კონსულტაცია", "დოკუმენტის ანალიზი", "ყველაფერი სტანდარტიდან"],
    featuresEn: ["Unlimited consultations", "Document analysis", "Everything in Standard"],
    isFree: false, highlighted: false, visible: true, active: true, order: 2,
  },
]

function toData(d: PlanDoc): PlanData {
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
    docGeneration: d.docGeneration ?? 0,
    docReview: d.docReview ?? 0,
    features: d.features ?? [],
    featuresEn: d.featuresEn ?? [],
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
  const count = await Plan.estimatedDocumentCount()
  if (count > 0) return
  await Plan.insertMany(DEFAULT_PLANS)
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
      docGeneration: plan.docGeneration,
      docReview: plan.docReview,
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

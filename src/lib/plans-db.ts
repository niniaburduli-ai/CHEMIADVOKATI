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
    key: "free", name: "საბაზისო პაკეტი", nameEn: "Basic Plan",
    description: "სცადე როგორ მუშაობს", descriptionEn: "Try how it works",
    priceMinor: 0, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.free.consultations,
    docGeneration: PLAN_LIMITS.free.docGeneration,
    docReview: PLAN_LIMITS.free.docReview,
    features: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["9 AI lawyer consultations", "Official source citations", "View question history"],
    isFree: true, highlighted: false, visible: true, active: true, order: 0,
  },
  {
    key: "standard", name: "სტანდარტული პაკეტი", nameEn: "Standard Plan",
    description: "ყველაზე პოპულარული", descriptionEn: "Most popular",
    priceMinor: 1900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.standard.consultations,
    docGeneration: PLAN_LIMITS.standard.docGeneration,
    docReview: PLAN_LIMITS.standard.docReview,
    features: ["29 კონსულტაცია AI იურისტთან", "19 შაბლონის გენერირება", "9 დოკუმენტის შემოწმება", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["29 AI lawyer consultations", "19 template generations", "9 document reviews", "Official source citations", "View question history"],
    isFree: false, highlighted: true, visible: true, active: true, order: 1,
  },
  {
    key: "premium", name: "პრემიუმ (ბიზნეს) პაკეტი", nameEn: "Premium (Business) Plan",
    description: "ხშირი მომხმარებლისთვის", descriptionEn: "For frequent users",
    priceMinor: 9900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.premium.consultations,
    docGeneration: PLAN_LIMITS.premium.docGeneration,
    docReview: PLAN_LIMITS.premium.docReview,
    features: ["შეუზღუდავი კონსულტაცია AI იურისტთან", "შეუზღუდავი შაბლონის გენერირება", "99 დოკუმენტის/ხელშეკრულების შემოწმება", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა", "გაფართოებული იურიდიული ანალიზი"],
    featuresEn: ["Unlimited AI lawyer consultations", "Unlimited template generations", "99 document/contract reviews", "Official source citations", "View question history", "Advanced legal analysis"],
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
  if (count === 0) {
    await Plan.insertMany(DEFAULT_PLANS)
    return
  }
  // Sync all content fields from DEFAULT_PLANS so code changes take effect without manual DB edits
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
            docGeneration: def.docGeneration,
            docReview: def.docReview,
            features: def.features,
            featuresEn: def.featuresEn,
          },
        }
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

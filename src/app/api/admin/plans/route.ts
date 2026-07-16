import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { Plan } from "@/lib/models/Plan"
import { getPlans } from "@/lib/plans-db"

export const runtime = "nodejs"

const PLAN_KEY_RE = /^[a-z0-9-]+$/

export const PlanSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(PLAN_KEY_RE, "მხოლოდ a-z, 0-9, -"),
  name: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).default(""),
  description: z.string().trim().max(200).default(""),
  descriptionEn: z.string().trim().max(200).default(""),
  priceMinor: z.coerce.number().int().min(0).max(10_000_000).default(0),
  // 0 = no discount. Validated against priceMinor in POST/PATCH, not here (PATCH allows partial updates).
  discountPriceMinor: z.coerce.number().int().min(0).max(10_000_000).default(0),
  currency: z.string().trim().max(8).default("GEL"),
  period: z.string().trim().max(16).default("month"),
  consultations: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocGeneration: z.boolean().default(true),
  docGeneration: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocReview: z.boolean().default(true),
  docReview: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocTemplates: z.boolean().default(true),
  docTemplates: z.coerce.number().int().min(0).max(1_000_000).default(0),
  features: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocGeneration: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocGenerationEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocReview: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocReviewEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocTemplates: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocTemplatesEn: z.array(z.string().trim().max(200)).max(30).default([]),
  isFree: z.boolean().default(false),
  highlighted: z.boolean().default(false),
  visible: z.boolean().default(true),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(1000).default(0),
})

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const plans = await getPlans()
  return NextResponse.json({ data: plans })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = PlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  if (parsed.data.discountPriceMinor > 0 && parsed.data.discountPriceMinor >= parsed.data.priceMinor) {
    return NextResponse.json({ error: "ფასდაკლების ფასი უნდა იყოს რეგულარულ ფასზე ნაკლები" }, { status: 400 })
  }

  try {
    await dbConnect()
    const exists = await Plan.findOne({ key: parsed.data.key }).lean()
    if (exists) return NextResponse.json({ error: "ასეთი key უკვე არსებობს" }, { status: 409 })

    const doc = await Plan.create(parsed.data)
    revalidatePath("/pricing")
    revalidatePath("/")
    return NextResponse.json({ data: { id: String(doc._id) } })
  } catch (err) {
    console.error("[admin/plans] create failed:", { key: parsed.data.key, err })
    return NextResponse.json({ error: "შენახვა ვერ მოხერხდა" }, { status: 500 })
  }
}

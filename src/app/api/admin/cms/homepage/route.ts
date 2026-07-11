import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { HomePage } from "@/lib/models/HomePage"
import { HOME_SEED } from "@/lib/homepage-defaults"

export const runtime = "nodejs"

const KA_FILTER = { locale: { $ne: "en" } }

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await dbConnect()

  const raw = await HomePage.findOne(KA_FILTER).lean() as Record<string, unknown> | null

  if (!raw) {
    const created = await HomePage.create({ ...HOME_SEED, status: "draft", locale: "ka" })
    return NextResponse.json({ data: created.toObject() })
  }

  // Backfill fields that didn't exist in previous schema versions
  const data = {
    ...raw,
    sections: { ...HOME_SEED.sections, ...(raw.sections as object | undefined) },
    howItWorksHeading: (raw.howItWorksHeading as string | undefined) || HOME_SEED.howItWorksHeading,
    howItWorksHeadingEn: (raw.howItWorksHeadingEn as string | undefined) || HOME_SEED.howItWorksHeadingEn,
    howItWorks: (raw.howItWorks as unknown[] | undefined)?.length
      ? raw.howItWorks
      : HOME_SEED.howItWorks,
    serviceCards: (raw.serviceCards as unknown[] | undefined)?.length
      ? raw.serviceCards
      : HOME_SEED.serviceCards,
    cardsHeading: (raw.cardsHeading as string | undefined) || HOME_SEED.cardsHeading,
    cardsHeadingEn: (raw.cardsHeadingEn as string | undefined) || HOME_SEED.cardsHeadingEn,
    statsHeading: (raw.statsHeading as string | undefined) || HOME_SEED.statsHeading,
    statsHeadingEn: (raw.statsHeadingEn as string | undefined) || HOME_SEED.statsHeadingEn,
    stats: (raw.stats as unknown[] | undefined)?.length
      ? raw.stats
      : HOME_SEED.stats,
    featuresHeading: (raw.featuresHeading as string | undefined) || HOME_SEED.featuresHeading,
    featuresHeadingEn: (raw.featuresHeadingEn as string | undefined) || HOME_SEED.featuresHeadingEn,
    pricingHeading: (raw.pricingHeading as string | undefined) || HOME_SEED.pricingHeading,
    pricingHeadingEn: (raw.pricingHeadingEn as string | undefined) || HOME_SEED.pricingHeadingEn,
    plans: (raw.plans as unknown[] | undefined)?.length
      ? raw.plans
      : HOME_SEED.plans,
    faqHeading: (raw.faqHeading as string | undefined) || HOME_SEED.faqHeading,
    faqHeadingEn: (raw.faqHeadingEn as string | undefined) || HOME_SEED.faqHeadingEn,
  }

  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  delete (body as Record<string, unknown>)._id
  await dbConnect()
  const doc = await HomePage.findOneAndUpdate(
    KA_FILTER,
    { $set: { ...body, locale: "ka" } },
    { upsert: true, returnDocument: "after" }
  ).lean()
  revalidatePath("/")
  revalidatePath("/services")
  return NextResponse.json({ data: doc })
}

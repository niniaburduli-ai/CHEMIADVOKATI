import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { HomePage } from "@/lib/models/HomePage"
import { HOME_SEED } from "@/lib/homepage-defaults"
import { reqLocale, localeFilter } from "@/lib/cms-admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  await dbConnect()

  let raw = await HomePage.findOne(localeFilter(locale)).lean() as Record<string, unknown> | null
  // Prefill the EN editor from KA when no EN doc exists yet.
  if (!raw && locale === "en") {
    raw = await HomePage.findOne({ locale: { $ne: "en" } }).lean() as Record<string, unknown> | null
  }

  if (!raw) {
    const created = await HomePage.create({ ...HOME_SEED, status: "draft", locale })
    return NextResponse.json({ data: created.toObject() })
  }

  // Backfill new fields that didn't exist in previous schema versions
  const data = {
    ...raw,
    sections: (raw.sections as object | undefined) ?? HOME_SEED.sections,
    serviceCards: (raw.serviceCards as unknown[] | undefined)?.length
      ? raw.serviceCards
      : HOME_SEED.serviceCards,
    statsHeading: (raw.statsHeading as string | undefined) || HOME_SEED.statsHeading,
    stats: (raw.stats as unknown[] | undefined)?.length
      ? raw.stats
      : HOME_SEED.stats,
    featuresHeading: (raw.featuresHeading as string | undefined) || HOME_SEED.featuresHeading,
    pricingHeading: (raw.pricingHeading as string | undefined) || HOME_SEED.pricingHeading,
    plans: (raw.plans as unknown[] | undefined)?.length
      ? raw.plans
      : HOME_SEED.plans,
  }

  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  const body = await req.json()
  // Never let an inbound _id clobber the per-locale upsert target.
  delete (body as Record<string, unknown>)._id
  await dbConnect()
  const doc = await HomePage.findOneAndUpdate(
    localeFilter(locale),
    { $set: { ...body, locale } },
    { upsert: true, new: true }
  ).lean()
  revalidatePath("/")
  return NextResponse.json({ data: doc })
}

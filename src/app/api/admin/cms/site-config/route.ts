import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { SiteConfig } from "@/lib/models/SiteConfig"
import { reqLocale, localeFilter } from "@/lib/cms-admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  await dbConnect()
  let doc = await SiteConfig.findOne(localeFilter(locale)).lean()
  // Prefill the EN editor from the KA doc when no EN version exists yet.
  if (!doc && locale === "en") doc = await SiteConfig.findOne({ locale: { $ne: "en" } }).lean()
  return NextResponse.json({ data: doc ?? {} })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  const body = await req.json()
  await dbConnect()
  const doc = await SiteConfig.findOneAndUpdate(
    localeFilter(locale),
    { $set: { ...body, locale } },
    { upsert: true, new: true }
  ).lean()
  revalidatePath("/", "layout")
  return NextResponse.json({ data: doc })
}

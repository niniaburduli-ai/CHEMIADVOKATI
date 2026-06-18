import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { FooterContent } from "@/lib/models/FooterContent"
import { reqLocale, localeFilter } from "@/lib/cms-admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  await dbConnect()
  let doc = await FooterContent.findOne(localeFilter(locale)).lean()
  if (!doc && locale === "en") doc = await FooterContent.findOne({ locale: { $ne: "en" } }).lean()
  return NextResponse.json({ data: doc ?? { columns: [], disclaimer: "", copyright: "", status: "draft" } })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const locale = reqLocale(req)
  const body = await req.json()
  await dbConnect()
  const doc = await FooterContent.findOneAndUpdate(
    localeFilter(locale),
    { $set: { ...body, locale } },
    { upsert: true, new: true }
  ).lean()
  revalidatePath("/", "layout")
  return NextResponse.json({ data: doc })
}

import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { FeatureFlags } from "@/lib/models/FeatureFlags"
import { getFeatureFlags, FEATURE_DEFS } from "@/lib/features"

export const runtime = "nodejs"

const KEYS = FEATURE_DEFS.map((f) => f.key)

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const data = await getFeatureFlags()
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const update: Record<string, boolean> = {}
  for (const key of KEYS) {
    if (typeof body[key] === "boolean") update[key] = body[key]
  }

  await dbConnect()
  await FeatureFlags.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true })
  revalidatePath("/", "layout")
  const data = await getFeatureFlags()
  return NextResponse.json({ data })
}

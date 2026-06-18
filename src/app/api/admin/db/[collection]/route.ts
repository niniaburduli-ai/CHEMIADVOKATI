import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { getCollection, sanitizeWrite, stripHidden } from "@/lib/admin-collections"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, ctx: { params: Promise<{ collection: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { collection } = await ctx.params
  const col = getCollection(collection)
  if (!col) return NextResponse.json({ error: "Unknown collection" }, { status: 404 })

  const sp = req.nextUrl.searchParams
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 25))
  const skip = Math.max(0, Number(sp.get("skip")) || 0)

  await dbConnect()
  const [docs, total] = await Promise.all([
    col.model.find().sort({ _id: -1 }).skip(skip).limit(limit).lean(),
    col.model.estimatedDocumentCount(),
  ])

  const rows = (docs as Record<string, unknown>[]).map((d) => stripHidden(d, col.hidden))
  return NextResponse.json({ data: rows, total, skip, limit })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ collection: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { collection } = await ctx.params
  const col = getCollection(collection)
  if (!col) return NextResponse.json({ error: "Unknown collection" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 })
  }

  await dbConnect()
  try {
    const doc = await col.model.create(sanitizeWrite(body as Record<string, unknown>, col.hidden))
    revalidatePath("/", "layout")
    return NextResponse.json({ data: { id: String((doc as { _id: unknown })._id) } })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 }
    )
  }
}

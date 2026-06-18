import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isValidObjectId } from "mongoose"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { getCollection, sanitizeWrite, stripHidden } from "@/lib/admin-collections"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ collection: string; id: string }> }

async function resolve(ctx: Ctx) {
  const { collection, id } = await ctx.params
  const col = getCollection(collection)
  return { col, id }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { col, id } = await resolve(ctx)
  if (!col) return NextResponse.json({ error: "Unknown collection" }, { status: 404 })
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  await dbConnect()
  const doc = await col.model.findById(id).lean()
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ data: stripHidden(doc as Record<string, unknown>, col.hidden) })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { col, id } = await resolve(ctx)
  if (!col) return NextResponse.json({ error: "Unknown collection" }, { status: 404 })
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 })
  }

  await dbConnect()
  try {
    const doc = await col.model.findByIdAndUpdate(
      id,
      { $set: sanitizeWrite(body as Record<string, unknown>, col.hidden) },
      { new: true, runValidators: true }
    ).lean()
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    revalidatePath("/", "layout")
    return NextResponse.json({ data: stripHidden(doc as Record<string, unknown>, col.hidden) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 }
    )
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { col, id } = await resolve(ctx)
  if (!col) return NextResponse.json({ error: "Unknown collection" }, { status: 404 })
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  await dbConnect()
  const doc = await col.model.findByIdAndDelete(id).lean()
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  revalidatePath("/", "layout")
  return NextResponse.json({ ok: true })
}

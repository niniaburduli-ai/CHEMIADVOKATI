import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isValidObjectId } from "mongoose"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { Plan } from "@/lib/models/Plan"
import { PlanSchema } from "../route"

export const runtime = "nodejs"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json().catch(() => null)
  // All fields optional on update.
  const parsed = PlanSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  await dbConnect()
  // If key changes, ensure no collision with a different plan.
  if (parsed.data.key) {
    const clash = await Plan.findOne({ key: parsed.data.key, _id: { $ne: id } }).lean()
    if (clash) return NextResponse.json({ error: "ასეთი key უკვე არსებობს" }, { status: 409 })
  }

  const doc = await Plan.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean()
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  revalidatePath("/pricing")
  revalidatePath("/")
  return NextResponse.json({ data: { id } })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  await dbConnect()
  const doc = await Plan.findById(id).lean()
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  // Keep a free fallback plan intact.
  if (doc.isFree || doc.key === "free") {
    return NextResponse.json({ error: "უფასო გეგმის წაშლა შეუძლებელია" }, { status: 400 })
  }

  await Plan.findByIdAndDelete(id)
  revalidatePath("/pricing")
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}

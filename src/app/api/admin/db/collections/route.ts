import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { ADMIN_COLLECTIONS } from "@/lib/admin-collections"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await dbConnect()
  const data = await Promise.all(
    ADMIN_COLLECTIONS.map(async (c) => ({
      slug: c.slug,
      label: c.label,
      // Matches the list route's default filter so the sidebar count doesn't
      // include correspondence rows an admin already archived.
      count:
        c.slug === "email-log"
          ? await c.model.countDocuments({ archivedAt: null })
          : await c.model.estimatedDocumentCount(),
    }))
  )
  return NextResponse.json({ data })
}

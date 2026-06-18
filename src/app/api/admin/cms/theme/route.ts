import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { ThemeConfig } from "@/lib/models/ThemeConfig"
import { getThemeConfig, THEME_TOKENS } from "@/lib/theme"

export const runtime = "nodejs"

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const ALLOWED = new Set(THEME_TOKENS.map((t) => t.key))

function cleanTokens(input: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (ALLOWED.has(k) && typeof v === "string" && HEX.test(v.trim())) {
        out[k] = v.trim()
      }
    }
  }
  return out
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const data = await getThemeConfig()
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const radius = typeof body.radius === "string" ? body.radius.slice(0, 16) : "0.625rem"
  const baseFontSize = Math.min(24, Math.max(12, Number(body.baseFontSize) || 16))
  const fontFamily = ["sans", "serif", "system"].includes(body.fontFamily) ? body.fontFamily : "sans"

  const update = {
    light: cleanTokens(body.light),
    dark: cleanTokens(body.dark),
    radius,
    baseFontSize,
    fontFamily,
  }

  await dbConnect()
  await ThemeConfig.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true })
  revalidatePath("/", "layout")
  const data = await getThemeConfig()
  return NextResponse.json({ data })
}

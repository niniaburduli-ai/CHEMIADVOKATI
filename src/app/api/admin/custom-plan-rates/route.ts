import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { CustomPlanRates } from "@/lib/models/CustomPlanRates";
import { getCustomPlanRates } from "@/lib/custom-plan-rates";
import { CUSTOM_SERVICES } from "@/lib/custom-plan-rates-config";

export const runtime = "nodejs";

function isValidSteps(v: unknown): v is number[] {
  return Array.isArray(v) && v.length === 5 && v.every((n) => Number.isInteger(n) && n >= 0);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getCustomPlanRates();
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, number[]> = {};
  for (const service of CUSTOM_SERVICES) {
    const v = (body as Record<string, unknown>)[service];
    if (isValidSteps(v)) update[service] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await dbConnect();
  await CustomPlanRates.findOneAndUpdate({}, { $set: update }, { upsert: true, returnDocument: "after" });
  revalidatePath("/pricing");
  const data = await getCustomPlanRates();
  return NextResponse.json({ data });
}

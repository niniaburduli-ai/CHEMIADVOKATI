import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { CustomPlanRates } from "@/lib/models/CustomPlanRates";
import { getCustomPlanRatesFull } from "@/lib/custom-plan-rates";
import { CUSTOM_SERVICES, STEP_QUANTITIES, type CustomService } from "@/lib/custom-plan-rates-config";

export const runtime = "nodejs";

const DISCOUNT_FIELD: Record<CustomService, string> = {
  consultations: "discountConsultations",
  docTemplates: "discountDocTemplates",
  docGeneration: "discountDocGeneration",
  docReview: "discountDocReview",
};

function isValidSteps(v: unknown): v is number[] {
  return Array.isArray(v) && v.length === 5 && v.every((n) => Number.isInteger(n) && n >= 0);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getCustomPlanRatesFull();
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  await dbConnect();
  const existing = await CustomPlanRates.findOne().lean();

  const update: Record<string, number[]> = {};
  for (const service of CUSTOM_SERVICES) {
    const v = b[service];
    if (isValidSteps(v)) update[service] = v;

    const discountField = DISCOUNT_FIELD[service];
    const dv = b[discountField];
    if (isValidSteps(dv)) {
      const regular = update[service] ?? existing?.[service as keyof typeof existing];
      const regularArr = Array.isArray(regular) ? (regular as number[]) : STEP_QUANTITIES.map(() => 0);
      const overshoot = dv.findIndex((price, i) => price > 0 && price >= regularArr[i]);
      if (overshoot !== -1) {
        return NextResponse.json(
          { error: `ფასდაკლების ფასი უნდა იყოს რეგულარულ ფასზე ნაკლები (${service}, სვეტი ${overshoot + 1})` },
          { status: 400 }
        );
      }
      update[discountField] = dv;
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await CustomPlanRates.findOneAndUpdate({}, { $set: update }, { upsert: true, returnDocument: "after" });
  revalidatePath("/pricing");
  revalidatePath("/");
  const data = await getCustomPlanRatesFull();
  return NextResponse.json({ data });
}

import { NextResponse } from "next/server";
import { getCustomPlanRates } from "@/lib/custom-plan-rates";
import { STEP_QUANTITIES } from "@/lib/custom-plan-rates-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getCustomPlanRates();
  return NextResponse.json({ rates, steps: STEP_QUANTITIES });
}

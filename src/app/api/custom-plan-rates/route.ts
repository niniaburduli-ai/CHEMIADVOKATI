import { NextResponse } from "next/server";
import { getCustomPlanRatesFull } from "@/lib/custom-plan-rates";
import { STEP_QUANTITIES } from "@/lib/custom-plan-rates-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rates, discountRates } = await getCustomPlanRatesFull();
  return NextResponse.json({ rates, discountRates, steps: STEP_QUANTITIES });
}

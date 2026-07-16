import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { CustomCheckoutSchema } from "@/lib/validators";
import { createOneTimeCheckout, buildCustomOrderId } from "@/lib/flitt";
import { getCustomPlanRatesFull, computeCustomTotal, effectiveCustomRates } from "@/lib/custom-plan-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CustomCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();

  const { rates, discountRates } = await getCustomPlanRatesFull();
  // Always recompute the price server-side — the client-submitted selection
  // is never trusted for the amount, only for which services/quantities.
  // Charges the discounted price when one is set, same as the displayed total.
  const total = computeCustomTotal(effectiveCustomRates(rates, discountRates), parsed.data);
  if (total === null) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const user = await User.findById(session.user.id).lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orderId = buildCustomOrderId(String(user._id));

  try {
    const { checkoutUrl } = await createOneTimeCheckout(
      {
        orderId,
        description: "ინდივიდუალური პაკეტი (ერთჯერადი გადახდა)",
        amountMinor: total,
        merchantData: { userId: String(user._id), ...parsed.data },
      },
      { id: String(user._id), email: user.email, name: user.name }
    );
    // Custom-package pending state lives on its own fields — never touches
    // flittOrderId/flittPaymentId/subscriptionStatus, which an active
    // subscription may already be using.
    await User.findByIdAndUpdate(user._id, { customFlittOrderId: orderId });
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: "Payment provider error", detail: String(err instanceof Error ? err.message : err) },
      { status: 502 }
    );
  }
}

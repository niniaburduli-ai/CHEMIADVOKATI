import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Payment } from "@/lib/models/payment";
import { planActivationFields, parseOrderId } from "@/lib/flitt";
import { getPlanLimits } from "@/lib/plans-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dev-only: simulate a successful Flitt callback for the current user's pending order.
 *  Returns 404 in production so the route is effectively invisible outside local dev. */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const orderId = user.flittOrderId as string | undefined;
  if (!orderId) {
    return NextResponse.json({ error: "No pending order on this account. Start a checkout first." }, { status: 400 });
  }

  const { plan } = parseOrderId(orderId);
  if (!plan) {
    return NextResponse.json({ error: `Cannot parse plan from orderId: ${orderId}` }, { status: 400 });
  }

  const limits = await getPlanLimits(plan);
  // Use a fresh timestamp each run so every simulation creates a new payment
  // row (same orderId re-simulated would otherwise hit $setOnInsert no-op).
  const paymentId = `dev_sim_${orderId}_${Date.now()}`;

  user.set({
    ...planActivationFields(plan, limits),
    flittOrderId: orderId,
    flittPaymentId: paymentId,
  });

  await user.save();

  await Payment.updateOne(
    { paymentId },
    {
      $setOnInsert: {
        userId: user._id,
        orderId,
        paymentId,
        plan,
        amount: 0,
        currency: "GEL",
        status: "approved",
        paidAt: new Date(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, plan });
}

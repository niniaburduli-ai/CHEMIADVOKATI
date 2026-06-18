import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Payment } from "@/lib/models/payment";
import {
  verifyCallback,
  parseOrderId,
  planActivationFields,
  planDeactivationFields,
} from "@/lib/flitt";
import { getPlanLimits } from "@/lib/plans-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve the target user from the callback (order_id first, merchant_data fallback). */
async function resolveUser(data: { order_id?: string; merchant_data?: string }) {
  const { plan, userId } = parseOrderId(data.order_id ?? "");
  let resolvedPlan = plan;
  let resolvedUserId = userId;

  if (!resolvedUserId && data.merchant_data) {
    try {
      const md = JSON.parse(data.merchant_data) as { userId?: string; plan?: string };
      resolvedUserId = md.userId ?? null;
      resolvedPlan = resolvedPlan ?? md.plan ?? null;
    } catch {
      /* ignore malformed merchant_data */
    }
  }
  if (!resolvedUserId) return { user: null, plan: resolvedPlan };
  const user = await User.findById(resolvedUserId);
  return { user, plan: resolvedPlan };
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    // Flitt sends JSON; tolerate form-encoded just in case.
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      raw = await req.json();
    } else {
      raw = Object.fromEntries(new URLSearchParams(await req.text()));
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = verifyCallback(raw);
  if (!data) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  await dbConnect();
  const { user, plan } = await resolveUser(data);
  // Always 200 so Flitt stops retrying; nothing to update if no user matched.
  if (!user) return NextResponse.json({ status: "ignored" });

  const approved =
    data.order_status === "approved" && data.response_status !== "failure";

  if (approved && plan) {
    const limits = await getPlanLimits(plan);
    user.set({
      ...planActivationFields(plan, limits),
      flittOrderId: data.order_id ?? user.flittOrderId,
      flittPaymentId: String(data.payment_id ?? user.flittPaymentId ?? ""),
    });
    // Record the charge as an invoice (idempotent on retries via paymentId).
    const amount = Number(data.amount) || 0;
    const paymentId = String(data.payment_id ?? data.order_id ?? "");
    await Payment.updateOne(
      { paymentId },
      {
        $setOnInsert: {
          userId: user._id,
          orderId: data.order_id ?? "",
          paymentId,
          plan,
          amount,
          currency: "GEL",
          status: "approved",
          paidAt: new Date(),
        },
      },
      { upsert: true }
    );
  } else if (
    data.order_status === "declined" ||
    data.order_status === "expired" ||
    data.order_status === "reversed"
  ) {
    user.set(planDeactivationFields(data.order_status));
  } else {
    // processing / other intermediate states — acknowledge without change.
    return NextResponse.json({ status: "ok" });
  }
  await user.save();

  return NextResponse.json({ status: "ok" });
}

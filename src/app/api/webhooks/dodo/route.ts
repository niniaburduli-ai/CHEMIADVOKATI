import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import {
  planForProductId,
  planActivationFields,
  planDeactivationFields,
  type PaidPlan,
} from "@/lib/dodo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Events that grant/refresh paid access vs. those that revoke it.
const ACTIVATE = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.plan_changed",
]);
const DEACTIVATE = new Set([
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
]);

type DodoEvent = {
  type?: string;
  data?: {
    subscription_id?: string;
    customer_id?: string;
    product_id?: string;
    status?: string;
    customer?: { customer_id?: string; email?: string } | null;
    metadata?: Record<string, string> | null;
  };
};

/** Locate the user this event refers to, trying the most reliable keys first. */
async function findUser(data: NonNullable<DodoEvent["data"]>) {
  const userId = data.metadata?.userId;
  if (userId) {
    const byId = await User.findById(userId);
    if (byId) return byId;
  }
  if (data.subscription_id) {
    const bySub = await User.findOne({ dodoSubscriptionId: data.subscription_id });
    if (bySub) return bySub;
  }
  const email = data.customer?.email;
  if (email) return User.findOne({ email: email.toLowerCase() });
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Raw body is required for signature verification.
  const raw = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  try {
    new Webhook(secret).verify(raw, headers);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.type ?? "";
  const data = event.data;
  // Only subscription lifecycle events change access.
  if (!data || (!ACTIVATE.has(type) && !DEACTIVATE.has(type))) {
    return NextResponse.json({ received: true });
  }

  await dbConnect();
  const user = await findUser(data);
  if (!user) {
    // Ack so the provider stops retrying; nothing to update.
    return NextResponse.json({ received: true, matched: false });
  }

  if (ACTIVATE.has(type)) {
    const plan: PaidPlan =
      (data.metadata?.plan as PaidPlan | undefined) ??
      planForProductId(data.product_id) ??
      "standard";
    user.set({
      ...planActivationFields(plan),
      dodoSubscriptionId: data.subscription_id ?? user.dodoSubscriptionId,
      dodoCustomerId:
        data.customer_id ?? data.customer?.customer_id ?? user.dodoCustomerId,
    });
  } else {
    user.set(planDeactivationFields(data.status || type.split(".")[1] || "cancelled"));
  }
  await user.save();

  return NextResponse.json({ received: true });
}

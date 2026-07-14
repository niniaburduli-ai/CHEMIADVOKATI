import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Payment } from "@/lib/models/payment";
import {
  verifyCallback,
  parseOrderId,
  planActivationFields,
  planDeactivationFields,
  isSandboxCredentials,
  isCustomOrderId,
  parseCustomOrderId,
  PERIOD_MS,
} from "@/lib/flitt";
import { getPlanByKey, getPlanLimits } from "@/lib/plans-db";
import { STEP_QUANTITIES } from "@/lib/custom-plan-rates-config";
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail } from "@/lib/mailer";

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

type CustomQuantities = {
  consultations: number;
  docTemplates: number;
  docGeneration: number;
  docReview: number;
};

/** A valid purchased quantity is either 0 (not purchased) or one of the defined steps. */
function isValidStepQuantity(n: number): boolean {
  return n === 0 || (STEP_QUANTITIES as readonly number[]).includes(n);
}

/** Resolve the target user + purchased quantities for a `custom_` order. */
async function resolveCustomOrder(data: {
  order_id?: string;
  merchant_data?: string;
}): Promise<{ userId: string | null; quantities: CustomQuantities | null }> {
  let userId: string | null = null;
  let quantities: CustomQuantities | null = null;

  if (data.merchant_data) {
    try {
      const md = JSON.parse(data.merchant_data) as { userId?: string } & Partial<CustomQuantities>;
      userId = md.userId ?? null;
      const parsed: CustomQuantities = {
        consultations: Number(md.consultations) || 0,
        docTemplates: Number(md.docTemplates) || 0,
        docGeneration: Number(md.docGeneration) || 0,
        docReview: Number(md.docReview) || 0,
      };
      // Defense-in-depth: merchant_data is client-influenced. Each quantity
      // must be 0 or one of the defined purchase steps — anything else (e.g.
      // a tampered or corrupted value) is treated the same as unparseable
      // merchant_data so it flows into the audit/no-grant branch instead of
      // silently granting an arbitrary amount.
      const allValid = Object.values(parsed).every(isValidStepQuantity);
      quantities = allValid ? parsed : null;
    } catch {
      /* ignore malformed merchant_data */
    }
  }
  if (!userId) userId = parseCustomOrderId(data.order_id ?? "").userId;
  return { userId, quantities };
}

/**
 * Handle a `custom_` order end-to-end and return the response — completely
 * separate code path from the subscription flow below. Never sets `plan`,
 * `planExpiresAt`, `subscriptionStatus`, or the primary `*Remaining` fields;
 * only ever touches the `custom*` fields, so an active subscription (or the
 * free tier) is left exactly as it was.
 */
async function handleCustomOrder(data: {
  order_id?: string;
  merchant_data?: string;
  order_status?: string;
  response_status?: string;
  amount?: unknown;
  payment_id?: unknown;
}): Promise<Response> {
  const { userId, quantities } = await resolveCustomOrder(data);
  if (!userId) return NextResponse.json({ status: "ignored" });

  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ status: "ignored" });

  const approved = data.order_status === "approved" && data.response_status !== "failure";
  const amount = Number(data.amount) || 0;
  const paymentId = String(data.payment_id ?? data.order_id ?? "");

  // Idempotency: Flitt (and payment gateways in general) can redeliver a
  // callback after a timeout even though a 200 was eventually returned. The
  // subscription flow is naturally idempotent because it `$set`s fixed
  // fields, but this branch `$inc`s quota, so a retry must never reach the
  // `User` grant twice. Rather than check-then-act (findOne, then later
  // insert), the `Payment` upsert itself is the atomic claim: `paymentId` is
  // now `unique` at the DB level, and `findOneAndUpdate({upsert:true, new:
  // false})` returns the pre-existing doc (non-null) if one already existed,
  // or `null` if THIS call performed the insert. Concurrent callbacks for the
  // same paymentId are serialized by Mongo at the unique-index level, so at
  // most one caller ever observes `claim === null`.

  // Same sandbox guard as the subscription flow: a sandbox-signed "approved"
  // callback must never grant real quota, in any environment.
  if (approved && isSandboxCredentials()) {
    const claim = await Payment.findOneAndUpdate(
      { paymentId },
      {
        $setOnInsert: {
          userId: user._id,
          orderId: data.order_id ?? "",
          paymentId,
          plan: "custom",
          amount,
          currency: "GEL",
          status: "sandbox_test",
          sandbox: true,
          paidAt: new Date(),
        },
      },
      { upsert: true, new: false }
    );
    if (claim === null) {
      console.warn(
        `[flitt/callback] Sandbox-signed "approved" callback for custom order ${data.order_id} (user ${user._id}) — recorded, real grant blocked.`
      );
    }
    return NextResponse.json({ status: "ignored_sandbox" });
  }

  if (approved && quantities) {
    const claim = await Payment.findOneAndUpdate(
      { paymentId },
      {
        $setOnInsert: {
          userId: user._id,
          orderId: data.order_id ?? "",
          paymentId,
          plan: "custom",
          amount,
          currency: "GEL",
          status: "approved",
          paidAt: new Date(),
        },
      },
      { upsert: true, new: false }
    );
    if (claim !== null) {
      // A Payment already existed for this paymentId — retried/duplicate
      // webhook delivery for an already-processed payment. Do not grant
      // quota again.
      return NextResponse.json({ status: "ok" });
    }

    const inc: Record<string, number> = {};
    if (quantities.consultations > 0) inc.customConsultationsRemaining = quantities.consultations;
    if (quantities.docTemplates > 0) inc.customDocTemplatesRemaining = quantities.docTemplates;
    if (quantities.docGeneration > 0) inc.customDocGenerationRemaining = quantities.docGeneration;
    if (quantities.docReview > 0) inc.customDocReviewRemaining = quantities.docReview;

    await User.findByIdAndUpdate(user._id, {
      $set: {
        customPlanExpiresAt: new Date(Date.now() + PERIOD_MS),
        customFlittOrderId: data.order_id ?? "",
        customFlittPaymentId: paymentId,
      },
      ...(Object.keys(inc).length > 0 ? { $inc: inc } : {}),
    });

    try {
      await sendPaymentConfirmationEmail(user.email, {
        name: user.name,
        planNameKa: "საკუთარი პაკეტი",
        planNameEn: "Custom package",
        amount,
        currency: "GEL",
        consultations: quantities.consultations,
        docGeneration: quantities.docGeneration,
        docReview: quantities.docReview,
        docTemplates: quantities.docTemplates,
      });
    } catch {
      // Email delivery failure shouldn't block quota grant — it's already applied.
    }
  } else if (approved && !quantities) {
    // A real charge was confirmed by Flitt but merchant_data was missing,
    // failed to parse, or contained an invalid quantity, so we have no
    // trustworthy quantities to grant. Silently returning "ok" here would eat
    // a real payment with nothing left to reconcile against — log loudly and
    // leave an audit record for manual follow-up.
    const claim = await Payment.findOneAndUpdate(
      { paymentId },
      {
        $setOnInsert: {
          userId: user._id,
          orderId: data.order_id ?? "",
          paymentId,
          plan: "custom",
          amount,
          currency: "GEL",
          status: "approved_needs_review",
          paidAt: new Date(),
        },
      },
      { upsert: true, new: false }
    );
    if (claim === null) {
      console.error(
        `[flitt/callback] Approved custom order ${data.order_id} (user ${user._id}) has missing/unparseable merchant_data — no quota granted, needs manual reconciliation.`
      );
    }
  }
  // Declined/expired/reversed/other: nothing was granted yet, so there is
  // nothing to roll back — no field changes.

  return NextResponse.json({ status: "ok" });
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

  if (isCustomOrderId(data.order_id ?? "")) {
    return handleCustomOrder(data);
  }

  const { user, plan } = await resolveUser(data);
  // Always 200 so Flitt stops retrying; nothing to update if no user matched.
  if (!user) return NextResponse.json({ status: "ignored" });

  const approved =
    data.order_status === "approved" && data.response_status !== "failure";

  // Flitt's sandbox environment sends fully-valid, correctly-signed callbacks
  // for test payments — a sandbox "approved" webhook is byte-for-byte
  // indistinguishable from a live one except for which secret signed it. If
  // that secret is Flitt's published test default, this callback can only
  // have come from sandbox/test traffic, so it must NEVER grant real plan
  // quota, in any environment (dev, staging, or a misconfigured production).
  // The attempt is still recorded (tagged `sandbox: true`) so it's visible
  // in the DB without ever touching the user's actual subscription state.
  if (approved && plan && isSandboxCredentials()) {
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
          status: "sandbox_test",
          sandbox: true,
          paidAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.warn(
      `[flitt/callback] Sandbox-signed "approved" callback for user ${user._id} (order ${data.order_id}) — recorded, real plan activation blocked.`
    );
    return NextResponse.json({ status: "ignored_sandbox" });
  }

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

    try {
      const planData = await getPlanByKey(plan);
      await sendPaymentConfirmationEmail(user.email, {
        name: user.name,
        planNameKa: planData?.name ?? plan,
        planNameEn: planData?.nameEn ?? plan,
        amount,
        currency: "GEL",
        consultations: limits.consultations,
        docGeneration: limits.docGeneration,
        docReview: limits.docReview,
        docTemplates: limits.docTemplates,
      });
    } catch {
      // Email delivery failure shouldn't block plan activation — quota is already granted.
    }
  } else if (
    !isSandboxCredentials() &&
    (data.order_status === "declined" ||
      data.order_status === "expired" ||
      data.order_status === "reversed")
  ) {
    // Only notify on an actual transition — Flitt can redeliver the same
    // decline callback, and the status would already be set from the first
    // delivery in that case.
    const statusChanged = user.subscriptionStatus !== data.order_status;
    user.set(planDeactivationFields(data.order_status));
    if (statusChanged) {
      try {
        await sendPaymentFailedEmail(user.email, { name: user.name, reason: data.order_status });
      } catch {
        // Email delivery failure shouldn't block the deactivation — status is already updated.
      }
    }
  } else {
    // processing / other intermediate states — acknowledge without change.
    return NextResponse.json({ status: "ok" });
  }
  await user.save();

  return NextResponse.json({ status: "ok" });
}

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { getPlanByKey, effectivePriceMinor } from "@/lib/plans-db";
import { sendRenewalReminderEmail, sendPaymentRetryReminderEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Daily reminders (triggered by Vercel Cron, see vercel.json):
 * - "payment due tomorrow" for active subscriptions renewing within 24h.
 * - "payment still pending, please retry" for subscriptions declined 24-48h ago.
 * Both are deduped against a *SentFor field so a daily run only ever emails
 * once per renewal cycle / once per decline event.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const now = Date.now();

  let renewalRemindersSent = 0;
  const dueSoon = await User.find({
    subscriptionStatus: "active",
    resetAt: { $gte: new Date(now), $lte: new Date(now + DAY_MS) },
  });
  for (const user of dueSoon) {
    if (
      user.renewalReminderSentFor &&
      user.resetAt &&
      user.renewalReminderSentFor.getTime() === user.resetAt.getTime()
    ) {
      continue;
    }
    try {
      const planData = await getPlanByKey(user.plan);
      await sendRenewalReminderEmail(user.email, {
        name: user.name,
        planNameKa: planData?.name ?? user.plan,
        planNameEn: planData?.nameEn ?? user.plan,
        amount: planData ? effectivePriceMinor(planData) : 0,
        currency: "GEL",
      });
      user.renewalReminderSentFor = user.resetAt;
      await user.save();
      renewalRemindersSent++;
    } catch (err) {
      console.error(`[cron/reminders] renewal reminder failed for user ${user._id}:`, err);
    }
  }

  let retryRemindersSent = 0;
  const recentlyDeclined = await User.find({
    subscriptionStatus: "declined",
    subscriptionStatusChangedAt: { $gte: new Date(now - 2 * DAY_MS), $lte: new Date(now - DAY_MS) },
  });
  for (const user of recentlyDeclined) {
    if (
      user.retryReminderSentFor &&
      user.subscriptionStatusChangedAt &&
      user.retryReminderSentFor.getTime() === user.subscriptionStatusChangedAt.getTime()
    ) {
      continue;
    }
    try {
      await sendPaymentRetryReminderEmail(user.email, user.name);
      user.retryReminderSentFor = user.subscriptionStatusChangedAt;
      await user.save();
      retryRemindersSent++;
    } catch (err) {
      console.error(`[cron/reminders] retry reminder failed for user ${user._id}:`, err);
    }
  }

  return NextResponse.json({ status: "ok", renewalRemindersSent, retryRemindersSent });
}

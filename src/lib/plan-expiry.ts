import { User } from "@/lib/models/user";
import { getPlanLimits } from "@/lib/plans-db";

type PlanCheckable = {
  _id: unknown;
  plan?: string | null;
  planExpiresAt?: Date | null;
};

/**
 * Lazily downgrade an admin-assigned plan back to free once its stored
 * expiry date has passed. There's no cron in this app, so enforcement
 * happens on next read instead — call this right after fetching any user
 * doc whose plan/limits matter (quota checks, dashboard, billing).
 */
export async function applyPlanExpiryIfDue<T extends PlanCheckable>(
  user: T
): Promise<T> {
  const expiresAt = user.planExpiresAt;
  if (
    !expiresAt ||
    !user.plan ||
    user.plan === "free" ||
    new Date(expiresAt) > new Date()
  ) {
    return user;
  }

  const limits = await getPlanLimits("free");
  const fields = {
    plan: "free",
    consultationsRemaining: limits.consultations,
    docGenerationRemaining: limits.docGeneration,
    docReviewRemaining: limits.docReview,
    docTemplatesRemaining: limits.docTemplates,
    planExpiresAt: null,
    planGrantedByAdmin: false,
  };
  await User.findByIdAndUpdate(user._id, { $set: fields });
  return { ...user, ...fields };
}

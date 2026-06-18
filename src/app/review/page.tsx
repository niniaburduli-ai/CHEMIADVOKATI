import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { ReviewClient } from "./review-client";

export default async function ReviewPage() {
  const [session, flags] = await Promise.all([auth(), getFeatureFlags()]);
  if (!flags.review) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/review");
  return <ReviewClient />;
}

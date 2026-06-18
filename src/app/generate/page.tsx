import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { GenerateClient } from "./generate-client";

export default async function GeneratePage() {
  const [session, flags] = await Promise.all([auth(), getFeatureFlags()]);
  if (!flags.generate) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/generate");
  return <GenerateClient />;
}

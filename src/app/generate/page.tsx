import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { GenerateClient } from "./generate-client";

type Props = { searchParams: Promise<{ type?: string }> };

export default async function GeneratePage({ searchParams }: Props) {
  const [session, flags, { type }, locale] = await Promise.all([
    auth(),
    getFeatureFlags(),
    searchParams,
    getLocale(),
  ]);
  if (!flags.generate) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/generate");
  return <GenerateClient initialType={type} locale={locale} />;
}

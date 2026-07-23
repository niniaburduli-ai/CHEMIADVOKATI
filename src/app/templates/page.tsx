import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { TemplatesClient } from "./templates-client";

type Props = { searchParams: Promise<{ type?: string }> };

export default async function TemplatesPage({ searchParams }: Props) {
  const [session, flags, { type }, locale] = await Promise.all([
    auth(),
    getFeatureFlags(),
    searchParams,
    getLocale(),
  ]);
  if (!flags.templates) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/templates");
  return <TemplatesClient initialType={type} locale={locale} />;
}

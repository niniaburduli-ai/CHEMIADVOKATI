import { getLocale } from "@/lib/i18n/locale"
import { LegislationClient } from "./legislation-client"

export default async function LegislationPage() {
  const locale = await getLocale()
  return <LegislationClient locale={locale} />
}

import { redirect } from "next/navigation"
import { getFeatureFlags } from "@/lib/features"

// Server guard: the legislation page is a client component, so flag enforcement
// lives here in its segment layout.
export default async function LegislationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const flags = await getFeatureFlags()
  if (!flags.legislation) redirect("/")
  return <>{children}</>
}

import { AlertTriangle } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { getFeatureFlags } from "@/lib/features";

/** Site-wide notice while the platform is in test mode. Rendered once in the
 * root layout, below the header, on every page. Can be disabled from the
 * admin panel's ფუნქციები (Features) tab. */
export async function TestModeBanner() {
  const flags = await getFeatureFlags();
  if (!flags.testModeBanner) return null;

  const locale = await getLocale();
  const d = getDict(locale);

  return (
    <div className="w-full border-b border-border bg-background">
      <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{d.testModeBanner.message}</span>
      </div>
    </div>
  );
}

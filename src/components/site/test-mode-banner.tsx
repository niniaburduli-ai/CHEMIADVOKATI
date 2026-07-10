import { AlertTriangle } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

/** Site-wide notice while the platform is in test mode. Rendered once in the
 * root layout, below the header, on every page. */
export async function TestModeBanner() {
  const locale = await getLocale();
  const d = getDict(locale);

  return (
    <div className="w-full border-b border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/40">
      <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{d.testModeBanner.message}</span>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Mail, Phone, MapPin, Globe, TriangleAlert } from "lucide-react";
import { getFooter, getSiteConfig } from "@/lib/cms";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { getFeatureFlags, isPathEnabled } from "@/lib/features";

const DEFAULT_DISCLAIMER =
  'გაფრთხილება: „პასუხი გენერირებულია ხელოვნური ინტელექტის მიერ და ეფუძნება მოქმედ კანონმდებლობას. ოფიციალური იურიდიული დასკვნისთვის მიმართეთ იურისტს."';
const DEFAULT_COPYRIGHT = "© 2026 ჩემი იურისტი - ყველა უფლება დაცულია.";

export async function Footer() {
  const locale = await getLocale();
  const d = getDict(locale);
  const [footer, config, flags] = await Promise.all([getFooter(locale), getSiteConfig(locale), getFeatureFlags()]);

  const staticNav = [
    { href: "/", label: d.footer.nav.home },
    { href: "/about", label: d.footer.nav.about },
    { href: "/services", label: d.footer.nav.services },
    { href: "/legislation", label: d.footer.nav.legislation },
    { href: "/blog", label: d.footer.nav.blog },
  ].filter((n) => isPathEnabled(n.href, flags));

  const staticLegal = [
    { href: "/privacy", label: d.footer.legal.privacy },
    { href: "/terms", label: d.footer.legal.terms },
    { href: "/disclaimer", label: d.footer.legal.disclaimer },
  ];

  const disclaimer = footer.disclaimer?.trim() || DEFAULT_DISCLAIMER;
  const copyright = footer.copyright?.trim() || DEFAULT_COPYRIGHT;
  const siteName = config.siteName?.trim() || "ჩემი იურისტი";
  const tagline = config.tagline?.trim() || "კანონი მარტივ ენაზე";
  const contactEmail = config.contactEmail?.trim() || "info@chemiuristi.ge";
  const contactPhone = config.contactPhone?.trim() || "+995 32 12 123 456";
  const contactAddress = config.contactAddress?.trim() || d.footer.address;

  return (
    <footer className="bg-[#3730a3] text-white">
      {/* Main footer grid */}
      <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-4 text-sm items-start">

        {/* Col 1 — brand */}
        <div className="space-y-2">
          <div>
            <p className="font-bold text-lg leading-tight">{siteName}</p>
            <p className="text-indigo-300 text-xs mt-0.5">{tagline}</p>
          </div>
          <p className="text-indigo-200 text-xs leading-relaxed">
            {d.footer.brandBlurb}
          </p>
        </div>

        {/* Col 2 — navigation */}
        <div>
          <p className="font-semibold text-white mb-2">{d.footer.navigation}</p>
          <ul className="space-y-1.5">
            {staticNav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="text-indigo-200 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — legal info */}
        <div>
          <p className="font-semibold text-white mb-2">{d.footer.usefulInfo}</p>
          <ul className="space-y-1.5">
            {staticLegal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-indigo-200 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — contact */}
        <div>
          <p className="font-semibold text-white mb-2">{d.footer.contact}</p>
          <ul className="space-y-1.5">
            {contactEmail && (
              <li className="flex items-center gap-2 text-indigo-200">
                <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors truncate">
                  {contactEmail}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2 text-indigo-200">
              <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
              <a href="https://chemiuristi.ge" className="hover:text-white transition-colors">
                chemiuristi.ge
              </a>
            </li>
            {contactPhone && (
              <li className="flex items-center gap-2 text-indigo-200">
                <Phone className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="hover:text-white transition-colors">
                  {contactPhone}
                </a>
              </li>
            )}
            {contactAddress && (
              <li className="flex items-center gap-2 text-indigo-200">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                <span>{contactAddress}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Warning banner — disclaimer from CMS */}
      <div className="py-2.5 px-4 border-t border-indigo-700">
        <p className="flex items-start justify-center gap-2 text-xs text-indigo-200 text-center leading-snug max-w-3xl mx-auto">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-indigo-300 mt-px" />
          <span>{disclaimer}</span>
        </p>
      </div>

      {/* Bottom bar — copyright from CMS */}
      <div className="border-t border-indigo-700">
        <div className="container mx-auto px-4 py-3 text-center">
          <p className="text-indigo-300 text-xs">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}

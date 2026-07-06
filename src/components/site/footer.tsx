import Link from "next/link";
import { Mail, Phone, MapPin, Globe, TriangleAlert } from "lucide-react";
import { getFooter, getSiteConfig } from "@/lib/cms";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { getFeatureFlags, isPathEnabled } from "@/lib/features";

const DEFAULT_DISCLAIMER =
  'გაფრთხილება: „პასუხი გენერირებულია ხელოვნური ინტელექტის მიერ და ეფუძნება მოქმედ კანონმდებლობას. ოფიციალური იურიდიული დასკვნისთვის მიმართეთ იურისტს."';
const DEFAULT_COPYRIGHT = "© 2026 ჩემი იურისტი - ყველა უფლება დაცულია.";

function VisaIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="Visa" role="img">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontStyle="italic" fontWeight="bold" fill="#ffffff">
        VISA
      </text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="Mastercard" role="img">
      <rect width="48" height="32" rx="4" fill="#16161d" />
      <circle cx="20" cy="16" r="9" fill="#EB001B" />
      <circle cx="28" cy="16" r="9" fill="#F79E1B" />
      <path
        d="M24 9.5a9 9 0 0 1 0 13 9 9 0 0 1 0-13Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 64 32" className="h-8 w-auto" aria-label="Google Pay" role="img">
      <rect width="64" height="32" rx="4" fill="#ffffff" stroke="#DADCE0" strokeWidth="0.75" />
      <g transform="translate(8, 8.3) scale(0.85)">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
      </g>
      <text x="30" y="21" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="500" fill="#3C4043">
        Pay
      </text>
    </svg>
  );
}

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
    <footer className="bg-slate-900 text-slate-100 border-t-2 border-primary/30">
      {/* Main footer — 5 equally-spaced columns, each w-max so width matches content */}
      <div className="container mx-auto px-4 py-8 flex flex-col gap-8 text-sm md:flex-row md:justify-between">

        {/* Col 1 — brand */}
        <div className="flex flex-col gap-2 w-max max-w-xs">
          <div>
            <p className="font-bold text-lg leading-tight text-white">{siteName}</p>
            <p className="text-slate-400 text-xs mt-0.5">{tagline}</p>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            {d.footer.brandBlurb}
          </p>
        </div>

        {/* Col 2 — navigation */}
        <div className="flex flex-col w-max">
          <p className="font-semibold text-slate-200 mb-2">{d.footer.navigation}</p>
          <ul className="flex flex-col gap-1.5">
            {staticNav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 footer-link"
                >
                  <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — legal info */}
        <div className="flex flex-col w-max">
          <p className="font-semibold text-slate-200 mb-2">{d.footer.usefulInfo}</p>
          <ul className="flex flex-col gap-1.5">
            {staticLegal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 footer-link"
                >
                  <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — contact */}
        <div className="flex flex-col w-max">
          <p className="font-semibold text-slate-200 mb-2">{d.footer.contact}</p>
          <ul className="flex flex-col gap-1.5">
            {contactEmail && (
              <li className="flex items-center gap-2 text-slate-400">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors truncate footer-link">
                  {contactEmail}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2 text-slate-400">
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <a href="https://chemiuristi.ge" className="hover:text-white transition-colors footer-link">
                chemiuristi.ge
              </a>
            </li>
            {contactPhone && (
              <li className="flex items-center gap-2 text-slate-400">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="hover:text-white transition-colors footer-link">
                  {contactPhone}
                </a>
              </li>
            )}
            {contactAddress && (
              <li className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span>{contactAddress}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Col 5 — payment methods */}
        <div className="flex flex-col w-max">
          <p className="font-semibold text-slate-200 mb-2">{d.footer.paymentMethods}</p>
          <div className="flex flex-col items-start gap-1.5">
            <VisaIcon />
            <MastercardIcon />
            <GooglePayIcon />
          </div>
        </div>
      </div>

      {/* Warning banner — disclaimer from CMS */}
      <div className="py-2.5 px-4 border-t border-slate-700/60">
        <p className="flex items-start justify-center gap-2 text-xs text-slate-400 text-center leading-snug max-w-3xl mx-auto">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-px" />
          <span>{disclaimer}</span>
        </p>
      </div>

      {/* Bottom bar — copyright from CMS */}
      <div className="border-t border-slate-700/60">
        <div className="container mx-auto px-4 py-3 text-center">
          <p className="text-slate-500 text-xs">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}

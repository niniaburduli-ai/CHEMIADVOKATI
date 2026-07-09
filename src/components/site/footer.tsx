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
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-label="Visa" role="img">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontStyle="italic" fontWeight="bold" fill="#ffffff">
        VISA
      </text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-label="Mastercard" role="img">
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

function ApplePayIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-label="Apple Pay" role="img">
      <rect width="48" height="32" rx="4" fill="#000000" />
      <g fill="#ffffff" transform="translate(6, 8)">
        <path d="M6.5 2.7c-.4.5-1.05.9-1.7.85-.08-.65.24-1.35.6-1.78.4-.5 1.1-.85 1.66-.87.07.68-.19 1.35-.56 1.8z" />
        <path d="M7.05 3.86c-.94-.06-1.74.53-2.19.53-.45 0-1.14-.5-1.89-.49-.97.01-1.87.56-2.36 1.43-1.01 1.75-.26 4.34.72 5.76.48.7 1.05 1.47 1.8 1.44.72-.03.99-.46 1.86-.46.87 0 1.11.46 1.87.45.78-.01 1.27-.7 1.74-1.4.55-.8.78-1.58.79-1.62-.02-.01-1.51-.58-1.53-2.3-.01-1.44 1.18-2.13 1.23-2.16-.67-.99-1.72-1.1-2.04-1.13z" />
        <path d="M17.4 1.9c1.85 0 3.14 1.28 3.14 3.14s-1.32 3.15-3.19 3.15h-2.05v3.26h-1.48V1.9h3.58zm-2.1 5.06h1.7c1.29 0 2.02-.69 2.02-1.91s-.73-1.9-2.01-1.9h-1.71v3.81z" />
        <path d="M20.94 9.35c0-1.22.94-1.97 2.6-2.06l1.92-.11v-.54c0-.78-.53-1.24-1.4-1.24-.83 0-1.35.4-1.48 1.02h-1.36c.08-1.26 1.15-2.19 2.9-2.19 1.71 0 2.78.89 2.78 2.28v4.78h-1.38v-1.14h-.03c-.41.77-1.28 1.26-2.19 1.26-1.36 0-2.36-.83-2.36-2.06zm4.52-.63v-.56l-1.73.11c-.86.06-1.35.44-1.35 1.03 0 .61.51 1.01 1.28 1.01 1 0 1.8-.68 1.8-1.59z" />
        <path d="M27.53 14.35v-1.16c.1.02.35.04.47.04.66 0 1.03-.28 1.25-1l.13-.42-2.5-6.94h1.55l1.75 5.63h.03l1.75-5.63h1.51l-2.6 7.3c-.59 1.68-1.28 2.22-2.72 2.22-.11 0-.47-.01-.62-.04z" />
      </g>
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-label="Google Pay" role="img">
      <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#DADCE0" strokeWidth="0.75" />
      <g transform="translate(4, 8.3) scale(0.7)">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
      </g>
      <text x="28" y="20" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="500" fill="#3C4043">
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
            <ApplePayIcon />
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

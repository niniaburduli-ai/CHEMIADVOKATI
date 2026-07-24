import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/header";
import { TestModeBanner } from "@/components/site/test-mode-banner";
import { Footer } from "@/components/site/footer";
import { FeedbackWidget } from "@/components/site/FeedbackWidget";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { getThemeConfig, buildThemeCss } from "@/lib/theme";
import { getSiteConfig } from "@/lib/cms";
import { getLocale } from "@/lib/i18n/locale";
import { JsonLd } from "@/components/site/JsonLd";
import {
  SITE_URL,
  SITE_NAME_KA,
  SITE_NAME_EN,
  DEFAULT_KEYWORDS,
  KEYWORDS_EN,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo";

const notoSans = Noto_Sans_Georgian({
  variable: "--font-noto-sans",
  subsets: ["georgian", "latin"],
  display: "swap",
});

const notoSerif = Noto_Serif_Georgian({
  variable: "--font-noto-serif",
  subsets: ["georgian", "latin"],
  display: "swap",
});

/**
 * Sitewide fallback metadata — used as-is by pages that don't set their own
 * (auth-gated app pages), and as the `title.template` base for every page.
 * Locale-aware: /en pages (see middleware.ts + lib/i18n/locale.ts) get the
 * English variant. Public marketing pages override title/description/canonical
 * via buildMetadata() in their own generateMetadata(); this is just the fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const siteName = isEn ? SITE_NAME_EN : SITE_NAME_KA;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: isEn
        ? "Chemi Iuristi — AI Legal Consultation for Georgia"
        : "ჩემი იურისტი — AI იურიდიული კონსულტაცია ქართულად",
      template: isEn ? "%s | Chemi Iuristi" : "%s | ჩემი იურისტი",
    },
    description: isEn
      ? "AI lawyer — accessible legal consultation in plain language. Contract review and generation, risk analysis, and legal advice grounded in Georgian law."
      : "AI იურისტი — ხელმისაწვდომი იურიდიული კონსულტაცია მარტივ ენაზე. ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი და იურიდიული რჩევები საქართველოს კანონმდებლობის საფუძველზე.",
    applicationName: siteName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteName,
    },
    keywords: isEn ? [...KEYWORDS_EN] : DEFAULT_KEYWORDS,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    category: "legal",
    alternates: { canonical: isEn ? "/en" : "/" },
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
      type: "website",
      siteName,
      locale: isEn ? "en_US" : "ka_GE",
      alternateLocale: isEn ? ["ka_GE"] : ["en_US"],
      url: isEn ? `${SITE_URL}/en` : SITE_URL,
      title: isEn
        ? "Chemi Iuristi — AI Legal Consultation for Georgia"
        : "ჩემი იურისტი — AI იურიდიული კონსულტაცია ქართულად",
      description: isEn
        ? "Accessible legal consultation, contract review and generation, risk analysis — grounded in Georgian law."
        : "ხელმისაწვდომი იურიდიული კონსულტაცია, ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი — საქართველოს კანონმდებლობის საფუძველზე.",
    },
    twitter: {
      card: "summary_large_image",
      title: isEn ? "Chemi Iuristi — AI Legal Consultation" : "ჩემი იურისტი — AI იურიდიული კონსულტაცია",
      description: isEn
        ? "AI lawyer: legal advice, contract review/generation, risk analysis for Georgia."
        : "AI იურისტი: იურიდიული რჩევები, ხელშეკრულების შემოწმება/გენერირება, რისკების ანალიზი ქართულად.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // Google Search Console verification (HTML-tag method). Array = one meta tag
    // per property: [0] old chemiadvokati.vercel.app, [1] new chemiiuristi.com.
    // NOTE: a GSC *Domain* property verifies via DNS TXT, not this tag.
    verification: {
      google: [
        "0VcyKMbTH9PBma4pNZkSDb9WbAilRphdOxCr_vxTFxA",
        "aEu0Nrgy_PHxDm7uJW9Grcd6S_SReIM7I1rcAdlT_ZU",
      ],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [themeConfig, locale] = await Promise.all([getThemeConfig(), getLocale()]);
  const themeCss = buildThemeCss(themeConfig);
  const siteConfig = await getSiteConfig(locale);
  const sameAs = Object.values(siteConfig.socialLinks ?? {}).filter((v): v is string => !!v);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground" suppressHydrationWarning>
        {/* Admin-editable theme: overrides globals.css tokens (see lib/theme.ts). */}
        <style id="cms-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        {/* Site-wide structured data: Organization/LegalService + WebSite search box. */}
        <JsonLd data={[organizationJsonLd(sameAs), webSiteJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Header />
          <TestModeBanner />
          <main className="flex-1">{children}</main>
          <Footer />
          <FeedbackWidget locale={locale} />
          <Toaster richColors position="top-center" />
          <InstallPrompt />
        </ThemeProvider>
        <ServiceWorkerRegister />
        {/* WebInsights analytics */}
        <Script
          src="https://webinsights.vercel.app/js/script.js"
          data-site-id="493bMjuYWhOg"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

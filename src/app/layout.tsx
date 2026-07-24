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
  DEFAULT_KEYWORDS,
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ჩემი იურისტი — AI იურიდიული კონსულტაცია ქართულად",
    template: "%s | ჩემი იურისტი",
  },
  description:
    "AI იურისტი — ხელმისაწვდომი იურიდიული კონსულტაცია მარტივ ენაზე. ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი და იურიდიული რჩევები საქართველოს კანონმდებლობის საფუძველზე.",
  applicationName: SITE_NAME_KA,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME_KA,
  },
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME_KA }],
  creator: SITE_NAME_KA,
  publisher: SITE_NAME_KA,
  category: "legal",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME_KA,
    locale: "ka_GE",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    title: "ჩემი იურისტი — AI იურიდიული კონსულტაცია ქართულად",
    description:
      "ხელმისაწვდომი იურიდიული კონსულტაცია, ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი — საქართველოს კანონმდებლობის საფუძველზე.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ჩემი იურისტი — AI იურიდიული კონსულტაცია",
    description:
      "AI იურისტი: იურიდიული რჩევები, ხელშეკრულების შემოწმება/გენერირება, რისკების ანალიზი ქართულად.",
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

import type { Metadata } from "next";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { FeedbackWidget } from "@/components/site/FeedbackWidget";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemeConfig, buildThemeCss } from "@/lib/theme";
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
  // Google Search Console verification (URL-prefix property, HTML-tag method).
  verification: { google: "0VcyKMbTH9PBma4pNZkSDb9WbAilRphdOxCr_vxTFxA" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [themeConfig, locale] = await Promise.all([getThemeConfig(), getLocale()]);
  const themeCss = buildThemeCss(themeConfig);

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
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FeedbackWidget locale={locale} />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

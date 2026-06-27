import type { Metadata } from "next";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemeConfig, buildThemeCss } from "@/lib/theme";
import { getLocale } from "@/lib/i18n/locale";

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
  title: "ჩემი იურისტი — იურიდიული რჩევები ქართულად",
  description:
    "ხელმისაწვდომი იურიდიული კონსულტაცია მარტივ ენაზე. დაფუძნებული საქართველოს კანონმდებლობაზე.",
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

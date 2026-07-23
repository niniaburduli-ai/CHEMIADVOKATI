import Link from "next/link";
import { User2 } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { GuestAuthButtons } from "@/components/site/guest-auth-buttons";
import { MobileNavSheet } from "@/components/site/mobile-nav-sheet";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { getNavMenu, getSiteConfig } from "@/lib/cms";
import { getFeatureFlags, isPathEnabled } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

export async function Header() {
  const locale = await getLocale();
  const [session, nav, config, flags] = await Promise.all([
    auth(),
    getNavMenu(locale),
    getSiteConfig(locale),
    getFeatureFlags(),
  ]);
  const d = getDict(locale);
  const user = session?.user;
  const navItems = nav.items.filter((n) => isPathEnabled(n.href, flags));

  const siteName = config.siteName?.trim() || "ჩემი იურისტი";
  const tagline = config.tagline?.trim() || "კანონი მარტივ ენაზე";
  const contactEmail = config.contactEmail?.trim() || "contact.chemiiuristi@gmail.com";
  const contactAddress = config.contactAddress?.trim() || d.footer.address;

  const legalItems = [
    { href: "/privacy", label: d.footer.legal.privacy },
    { href: "/terms", label: d.footer.legal.terms },
    { href: "/disclaimer", label: d.footer.legal.disclaimer },
  ];

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm transition-shadow">
      <div className="container mx-auto flex min-h-16 flex-wrap md:flex-nowrap items-center justify-between gap-x-6 gap-y-2 lg:gap-x-10 px-4 py-2">
        {/* Menu trigger (mobile) + Logo — stay together on the first line */}
        <div className="flex items-center gap-2 min-w-0 order-1 md:shrink-0">
          <MobileNavSheet
            siteName={siteName}
            menuLabel={d.header.menu}
            navItems={navItems}
            legalItems={legalItems}
            navigationLabel={d.footer.navigation}
            usefulInfoLabel={d.footer.usefulInfo}
            contactLabel={d.footer.contact}
            contactEmail={contactEmail}
            contactAddress={contactAddress}
          />
          <Link href="/" className="flex flex-col items-start leading-tight min-w-0 group">
            <span className="text-lg font-bold text-gold tracking-wide [font-family:var(--font-noto-serif)] transition-opacity group-hover:opacity-80 shrink-0">
              {siteName}
            </span>
            <span className="text-xs text-foreground font-normal truncate min-w-0">
              {tagline}
            </span>
          </Link>
        </div>

        {/* Language switcher — mobile only, top-right corner of line 1 */}
        <div className="md:hidden order-2 ml-auto shrink-0">
          <LanguageSwitcher current={locale} />
        </div>

        {/* Nav */}
        <nav className="hidden lg:flex items-center gap-4 lg:gap-5 text-sm shrink-0 order-2">
          {navItems.map((n) => (
            <Link
              key={n._id}
              href={n.href}
              target={n.isExternal ? "_blank" : undefined}
              rel={n.isExternal ? "noopener noreferrer" : undefined}
              className="text-foreground/70 hover:text-foreground font-medium transition-colors header-link pb-0.5"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Auth — wraps onto its own line on mobile, inline on desktop */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-1 sm:gap-2.5 shrink-0 order-3 w-full md:w-auto md:ml-auto">
          <div className="hidden md:block">
            <LanguageSwitcher current={locale} />
          </div>
          <ThemeToggle />
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " btn-hover"}
                >
                  {d.header.admin}
                </Link>
              )}
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "ghost", size: "sm" }) + " btn-hover"}
              >
                <User2 className="h-4 w-4 mr-1 text-gold" />
                {initials}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <GuestAuthButtons signInLabel={d.header.signIn} signUpLabel={d.header.signUp} />
          )}
        </div>
      </div>
    </header>
  );
}

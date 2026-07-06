import Link from "next/link";
import { User2 } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { GuestAuthButtons } from "@/components/site/guest-auth-buttons";
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm transition-shadow">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-y-2 px-4 py-2">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight shrink-0 group">
          <span className="text-lg font-bold text-primary tracking-wide [font-family:var(--font-noto-serif)] transition-opacity group-hover:opacity-80">
            {siteName}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {tagline}
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
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

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher current={locale} />
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
                <User2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{user.name ?? user.email}</span>
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

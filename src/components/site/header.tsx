import Link from "next/link";
import { User2 } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
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
    <header className="sticky top-0 z-40 w-full border-b bg-background shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight shrink-0">
          <span className="text-lg font-bold text-primary tracking-wide">
            {siteName}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {tagline}
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {navItems.map((n) => (
            <Link
              key={n._id}
              href={n.href}
              target={n.isExternal ? "_blank" : undefined}
              rel={n.isExternal ? "noopener noreferrer" : undefined}
              className="text-foreground/70 hover:text-foreground font-medium transition-colors"
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
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {d.header.admin}
                </Link>
              )}
              <Link
                href="/profile"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <User2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{user.name ?? user.email}</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {d.header.signIn}
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ size: "sm" })}
              >
                {d.header.signUp}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

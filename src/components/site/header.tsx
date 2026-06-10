import Link from "next/link";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

const publicNav = [
  { href: "/", label: "მთავარი" },
  { href: "/about", label: "ჩვენ შესახებ" },
  { href: "/services", label: "მომსახურებები" },
  { href: "/legislation", label: "კანონმდებლობა" },
  { href: "/blog", label: "ბლოგი" },
];

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight shrink-0">
          <span className="text-lg font-bold text-[#1a1a2e] tracking-wide">
            ჩემი იურისტი
          </span>
          <span className="text-xs text-[#6b7280] font-normal">
            კანონი მარტივ ენაზე
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {publicNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[#374151] hover:text-[#1a1a2e] font-medium transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  ადმინი
                </Link>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name ?? user.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                შესვლა
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ size: "sm" })}
                style={{ backgroundColor: "#1a1a2e", color: "#fff" }}
              >
                რეგისტრაცია
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

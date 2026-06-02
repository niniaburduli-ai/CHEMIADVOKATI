import Link from "next/link";
import { Scale } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

const nav = [
  { href: "/legislation", label: "კანონმდებლობა" },
  { href: "/pricing", label: "ფასები" },
  { href: "/chat", label: "კონსულტაცია" },
  { href: "/dashboard", label: "პროფილი" },
];

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Scale className="h-5 w-5" />
          <span>ჩემი ადვოკატი</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
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
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                შესვლა
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                რეგისტრაცია
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

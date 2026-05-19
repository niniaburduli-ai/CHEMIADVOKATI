import Link from "next/link";
import { Scale } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const nav = [
  { href: "/legislation", label: "კანონმდებლობა" },
  { href: "/pricing", label: "ფასები" },
  { href: "/chat", label: "კონსულტაცია" },
  { href: "/dashboard", label: "პროფილი" },
];

export function Header() {
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
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            შესვლა
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            რეგისტრაცია
          </Link>
        </div>
      </div>
    </header>
  );
}

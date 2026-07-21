"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

/**
 * Sign in / Sign up links that remember where the user was, so login returns
 * them to the current page instead of always landing on /dashboard. Skips the
 * callback on auth pages to avoid a redirect loop.
 */
export function GuestAuthButtons({
  signInLabel,
  signUpLabel,
}: {
  signInLabel: string;
  signUpLabel: string;
}) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const suffix = isAuthPage ? "" : `?callbackUrl=${encodeURIComponent(pathname)}`;

  return (
    <>
      <Link
        href={`/login${suffix}`}
        className={buttonVariants({ variant: "outline", size: "sm" }) + " btn-hover max-sm:h-6 max-sm:px-2 max-sm:text-xs"}
      >
        {signInLabel}
      </Link>
      <Link
        href={`/register${suffix}`}
        className={buttonVariants({ size: "sm" }) + " btn-hover max-sm:h-6 max-sm:px-2 max-sm:text-xs"}
      >
        {signUpLabel}
      </Link>
    </>
  );
}

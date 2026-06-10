import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/generate") ||
    pathname.startsWith("/review");

  const isAdminArea = pathname.startsWith("/admin");
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  if ((isProtected || isAdminArea) && !isLoggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminArea && isLoggedIn && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

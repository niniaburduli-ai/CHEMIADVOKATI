import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);
// `auth` is a heavily overloaded helper (session lookup, route-handler wrapper,
// middleware...); used directly as Middleware — the same way NextAuth's own
// docs show `export { auth as middleware }` — it behaves as (request, event)
// => Response. TS's overload resolution doesn't reflect that usage, so it's
// cast once here.
const authMiddleware = auth as unknown as (
  request: NextRequest,
  event: NextFetchEvent
) => ReturnType<typeof NextResponse.next> | Promise<ReturnType<typeof NextResponse.next>>;

/** Header carrying a URL-derived locale into the request, read by src/lib/i18n/locale.ts. */
const URL_LOCALE_HEADER = "x-url-locale";

/**
 * Public routes that actually have translated body content (see the matching
 * `bilingual: true` list in src/lib/seo.ts — keep the two in sync). Everything
 * else stays Georgian-only; an /en/<other> hit just 404s instead of silently
 * rewriting into an app route with the wrong locale forced on it.
 */
const EN_BILINGUAL_PATHS = new Set([
  "/",
  "/services",
  "/pricing",
  "/legislation",
  "/about",
  "/faq",
]);

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const stripped = pathname.slice(3); // "/en" -> "", "/en/services" -> "/services"
    const target = stripped === "" ? "/" : stripped;

    if (EN_BILINGUAL_PATHS.has(target)) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(URL_LOCALE_HEADER, "en");
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  return authMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

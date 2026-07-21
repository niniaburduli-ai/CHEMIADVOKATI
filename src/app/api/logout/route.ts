import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo";

// Session cookies have gone through two shapes over this project's life:
// host-only (pre root-domain fix) and domain-scoped (.chemiiuristi.com).
// next/headers' cookies() keys its internal Set-Cookie map by name alone, so
// calling cookies().delete() twice for the same name with different domains
// silently drops the first — only the last one is ever sent to the browser.
// Appending raw Set-Cookie headers directly bypasses that and clears both.
const COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  const rootDomain = `.${new URL(SITE_URL).hostname.replace(/^www\./, "")}`;

  for (const name of COOKIE_NAMES) {
    // __Secure- prefixed cookies are rejected by the browser unless the
    // clearing Set-Cookie also carries the Secure attribute — omitting it
    // silently no-ops the delete, leaving the session cookie (and the login) intact.
    const secure = name.startsWith("__Secure-") ? "; Secure" : "";
    res.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0${secure}`);
    res.headers.append("Set-Cookie", `${name}=; Path=/; Domain=${rootDomain}; Max-Age=0${secure}`);
  }

  return res;
}

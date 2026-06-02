import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Returns the session if the caller is an authenticated admin, else null.
 * Use in admin API routes and the admin page for defense-in-depth — the
 * middleware already redirects non-admins away from /admin, but API routes
 * and Server Components must re-check independently.
 */
export async function getAdminSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

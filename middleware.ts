/**
 * Gate for everything under /admin and /api/admin.
 *
 * Pages redirect to the login screen; API routes get a flat 401 so a fetch
 * from the dashboard fails loudly instead of receiving a login page as JSON.
 * The login and logout endpoints are the only holes.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAccessTokenCookieName } from "@insforge/sdk/ssr";
import { SESSION_COOKIE, verifySessionToken } from "@/app/api/admin/_lib/session";

const PUBLIC_PATHS = ["/admin/login", "/api/admin/login", "/api/admin/logout"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /* ----------------------------- customers ----------------------------- */
  // /profile is a customer area, not an admin one. This only checks that a
  // session cookie is PRESENT so the redirect can carry the path the visitor
  // actually wanted; whether the token is still valid is settled by the
  // profile layout and by every /api/auth/* route, both of which re-resolve
  // the session server-side.
  if (pathname.startsWith("/profile")) {
    if (request.cookies.get(getAccessTokenCookieName())?.value) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/profile/:path*"],
};

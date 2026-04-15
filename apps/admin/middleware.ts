import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookieEdge } from "@/lib/auth-edge";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icon")) {
    return NextResponse.next();
  }

  // API routes — no locale prefix, just auth check
  if (pathname.startsWith("/api/")) {
    const authPublic = ["/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/auth/status"];
    if (authPublic.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 16) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }
    const cookieValue = request.cookies.get("admin_session")?.value;
    const session = await verifySessionCookieEdge(cookieValue ?? null, secret);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Strip locale to check if path is public (login)
  const bare = stripLocale(pathname);
  if (bare === "/login" || bare.startsWith("/login/")) {
    return intlMiddleware(request);
  }

  // Auth check for all other pages
  const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl, 302);
  }

  const cookieValue = request.cookies.get("admin_session")?.value;
  const session = await verifySessionCookieEdge(cookieValue ?? null, secret);

  if (!session) {
    const locale = routing.locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("from", bare);
    return NextResponse.redirect(loginUrl, 302);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|favicon|icon|api/auth).*)"],
};

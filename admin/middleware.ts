import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookieEdge } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/auth/status"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Server misconfigured: SESSION_SECRET required" }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/login", request.url), 302);
  }

  const cookieValue = request.cookies.get("admin_session")?.value;
  const session = await verifySessionCookieEdge(cookieValue ?? null, secret);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/tools", "/skills", "/plugins", "/roles", "/permissions", "/registry", "/status", "/settings", "/api/:path*"],
};

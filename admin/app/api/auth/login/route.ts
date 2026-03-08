import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import { createSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await verifyCredentials(username, password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const cookie = createSessionCookie(username);
    const res = NextResponse.json({ ok: true, username });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, string | number | boolean>);
    return res;
  } catch (e) {
    if ((e as Error).message?.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

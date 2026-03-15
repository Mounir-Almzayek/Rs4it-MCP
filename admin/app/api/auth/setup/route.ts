import { NextRequest, NextResponse } from "next/server";
import { credentialsExist, saveCredentials } from "@/lib/credentials";
import { createSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    if (await credentialsExist()) {
      return NextResponse.json(
        { error: "Admin already configured" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { username?: string; password?: string };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || username.length === 0) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await saveCredentials(username, password);
    const cookie = createSessionCookie(username);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, string | number | boolean>);
    return res;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.message?.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Server misconfigured: set SESSION_SECRET" },
        { status: 503 }
      );
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      return NextResponse.json(
        { error: "Cannot write credentials file. Check that the config directory (e.g. /config in Docker) is writable by the app." },
        { status: 500 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Setup failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseUrl =
      process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000";
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/system2030-sessions`, {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "Failed to fetch sessions from Hub" }, { status: 500 });
    }
    const payload = (await res.json()) as { ok?: boolean; sessions?: unknown };
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
    return NextResponse.json(sessions);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read System2030 sessions" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl}/api/mcp-users`, {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; users?: unknown };
    const users = Array.isArray(payload?.users) ? payload.users : [];
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read MCP users" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recentLimit = searchParams.get("recentLimit");
    const since = searchParams.get("since") ?? undefined;
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const url = new URL(`${baseUrl}/api/usage`);
    if (since) url.searchParams.set("since", since);
    if (recentLimit) url.searchParams.set("recentLimit", recentLimit);
    const res = await fetch(url.toString(), {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; stats?: unknown };
    return NextResponse.json(payload?.stats ?? { byEntity: {}, recent: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read usage stats" },
      { status: 500 }
    );
  }
}

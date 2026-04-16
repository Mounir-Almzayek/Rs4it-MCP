import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function GET(request: NextRequest) {
  if (!requireSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${hubBaseUrl()}/api/marketplace/updates`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ updates: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ updates: [] });
  }
}

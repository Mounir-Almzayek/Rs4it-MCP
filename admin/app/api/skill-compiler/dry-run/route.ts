import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hubBase = process.env.HUB_BASE_URL ?? process.env.NEXT_PUBLIC_HUB_BASE_URL ?? "http://localhost:3000";
  const url = `${hubBase.replace(/\/$/, "")}/api/skill-compiler/dry-run`;
  const secret = process.env.MCP_ADMIN_API_SECRET ?? process.env.ADMIN_HUB_SECRET;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Admin-Secret"] = secret;

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("[admin] skill compiler dry-run failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}


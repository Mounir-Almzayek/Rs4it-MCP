import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const payload = await request.json();
    const res = await fetch(`${baseUrl}/api/settings/import`, {
      method: "POST",
      headers: { ...(secret ? { "x-admin-secret": secret } : {}), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = await res.text();
    return new NextResponse(json, { status: res.ok ? 200 : 500, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to import settings" },
      { status: 500 }
    );
  }
}


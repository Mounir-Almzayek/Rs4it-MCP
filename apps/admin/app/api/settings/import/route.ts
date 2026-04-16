import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const body = await request.arrayBuffer();
    const res = await fetch(`${baseUrl}/api/db/import`, {
      method: "POST",
      headers: {
        ...(secret ? { "x-admin-secret": secret } : {}),
        "Content-Type": "application/octet-stream",
      },
      body,
      cache: "no-store",
    });
    const json = await res.text();
    return new NextResponse(json, {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to import database" },
      { status: 500 }
    );
  }
}

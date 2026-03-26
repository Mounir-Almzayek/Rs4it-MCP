import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl}/api/settings/export`, {
      method: "POST",
      headers: { ...(secret ? { "x-admin-secret": secret } : {}), "Content-Type": "application/json" },
      body: JSON.stringify(await request.json().catch(() => ({}))),
      cache: "no-store",
    });
    const json = await res.text();
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rs4it-hub-settings.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export settings" },
      { status: 500 }
    );
  }
}


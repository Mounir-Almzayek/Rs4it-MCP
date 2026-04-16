import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl}/api/db/export`, {
      method: "GET",
      headers: { ...(secret ? { "x-admin-secret": secret } : {}) },
      cache: "no-store",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (d as { error?: string }).error ?? "Export failed" },
        { status: res.status }
      );
    }
    const blob = await res.arrayBuffer();
    const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]
      ?? `rs4it-hub-backup-${new Date().toISOString().slice(0, 10)}.db`;
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export database" },
      { status: 500 }
    );
  }
}

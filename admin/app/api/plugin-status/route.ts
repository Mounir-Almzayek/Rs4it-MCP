import { NextResponse } from "next/server";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl =
      (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl}/api/plugin-status`, {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; snapshot?: unknown };
    return NextResponse.json(payload?.snapshot ?? { updatedAt: null, plugins: [] }, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read plugin status" },
      { status: 500, headers: NO_STORE }
    );
  }
}

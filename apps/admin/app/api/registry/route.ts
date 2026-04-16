import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function GET(_request: NextRequest) {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/registry`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; registry?: unknown; error?: unknown };
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json({ error: String(payload?.error ?? "Failed to read registry") }, { status: 500, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      payload.registry ?? { tools: [], plugins: [], resources: [], rules: [], prompts: [], skills: [], subagents: [], commands: [] },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read registry" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

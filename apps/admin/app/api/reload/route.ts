import { NextResponse } from "next/server";

/**
 * Calls the Hub's /reload to close and reload all plugins (re-read config, reconnect).
 * After plugin add/remove/enable/disable, Admin calls this so tools appear/disappear without restarting the Hub.
 */
export async function POST() {
  const hubBase = process.env.HUB_BASE_URL ?? process.env.NEXT_PUBLIC_HUB_BASE_URL ?? "http://localhost:3000";
  const url = `${hubBase.replace(/\/$/, "")}/reload`;
  const secret = process.env.MCP_RELOAD_SECRET ?? process.env.ADMIN_RELOAD_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Reload-Secret"] = secret;
  try {
    const res = await fetch(url, { method: "POST", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: (data as { error?: string }).error ?? res.statusText },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[admin] Hub reload failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 502 }
    );
  }
}

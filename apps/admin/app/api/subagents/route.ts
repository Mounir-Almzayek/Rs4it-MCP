import { NextRequest, NextResponse } from "next/server";
import { validateAllowedRoles } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function GET() {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/subagents`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; subagents?: unknown };
    const subagents = Array.isArray(payload?.subagents) ? payload.subagents : [];
    return NextResponse.json(subagents, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read subagents" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { subagents?: any[] };
    const subagents = Array.isArray(body?.subagents) ? body.subagents : [];
    for (const s of subagents) {
      if (s.allowedRoles !== undefined) {
        const v = await validateAllowedRoles(s.allowedRoles);
        if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
        s.allowedRoles = v.value;
      }
    }
    const res = await fetch(`${hubBaseUrl()}/api/subagents`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ subagents }),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json({ error: String(payload?.error ?? "Failed to write subagents") }, { status: 500 });
    }
    return NextResponse.json(payload.subagents ?? [], { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to write subagents" }, { status: 500 });
  }
}

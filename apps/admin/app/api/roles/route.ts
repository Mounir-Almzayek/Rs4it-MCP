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
    const res = await fetch(`${hubBaseUrl()}/api/roles`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json(
        { error: String(payload?.error ?? "Failed to fetch roles") },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
    // Return RoleConfig directly (what Admin pages expect).
    return NextResponse.json(payload.config ?? { roles: [] }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

async function proxyWriteRoleConfig(request: NextRequest) {
  try {
    const body = await request.text();
    const res = await fetch(`${hubBaseUrl()}/api/roles`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      config?: unknown;
      error?: unknown;
    };
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json(
        { error: String(payload?.error ?? "Failed to update roles") },
        { status: res.status || 500, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(payload.config ?? { roles: [] }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update roles" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function PUT(request: NextRequest) {
  return proxyWriteRoleConfig(request);
}

// Backward compatibility:
// - Some pages call POST with a full RoleConfig body.
// - Older role-creation screens call POST with { id, name, inherits }.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (Array.isArray(body.roles)) {
      const res = await fetch(`${hubBaseUrl()}/api/roles`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; config?: unknown; error?: unknown };
      if (!res.ok || payload?.ok === false) {
        return NextResponse.json(
          { error: String(payload?.error ?? "Failed to update roles") },
          { status: res.status || 500, headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json(payload.config ?? { roles: [] }, { headers: NO_STORE_HEADERS });
    }

    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const inheritsRaw = body.inherits;
    const inherits = Array.isArray(inheritsRaw)
      ? inheritsRaw.map((v) => String(v ?? "").trim()).filter(Boolean)
      : undefined;
    if (!id) {
      return NextResponse.json({ error: "Role id is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const currentRes = await fetch(`${hubBaseUrl()}/api/roles`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    const currentPayload = (await currentRes.json().catch(() => ({}))) as {
      ok?: boolean;
      config?: { defaultRole?: string; roles?: Array<{ id?: string; name?: string; inherits?: string[] }> };
      error?: unknown;
    };
    if (!currentRes.ok || currentPayload?.ok === false) {
      return NextResponse.json(
        { error: String(currentPayload?.error ?? "Failed to fetch current roles") },
        { status: currentRes.status || 500, headers: NO_STORE_HEADERS }
      );
    }

    const config = currentPayload.config ?? { roles: [] };
    const roles = Array.isArray(config.roles) ? config.roles : [];
    if (roles.some((r) => String(r?.id ?? "").trim() === id)) {
      return NextResponse.json({ error: "Role with this id already exists" }, { status: 409, headers: NO_STORE_HEADERS });
    }

    const nextConfig = {
      ...config,
      roles: [...roles, { id, name: name || id, inherits }],
    };
    const writeRes = await fetch(`${hubBaseUrl()}/api/roles`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig),
      cache: "no-store",
    });
    const writePayload = (await writeRes.json().catch(() => ({}))) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!writeRes.ok || writePayload?.ok === false) {
      return NextResponse.json(
        { error: String(writePayload?.error ?? "Failed to create role") },
        { status: writeRes.status || 500, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(writePayload.config ?? nextConfig, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

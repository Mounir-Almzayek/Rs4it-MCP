import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl =
      process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000";
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/roles`, {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json(
        { error: String(payload?.error ?? "Failed to fetch roles from Hub") },
        { status: 500 }
      );
    }
    return NextResponse.json(payload.config ?? { roles: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl =
      process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000";
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const currentRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/roles`, {
      headers: secret ? { "x-admin-secret": secret } : {},
      cache: "no-store",
    });
    const currentPayload = (await currentRes.json()) as { ok?: boolean; config?: any };
    const config = (currentPayload?.config && typeof currentPayload.config === "object")
      ? currentPayload.config
      : { roles: [] };

    const body = (await request.json()) as any;
    const id = String(body?.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Role id is required" }, { status: 400 });
    config.roles = Array.isArray(config.roles) ? config.roles : [];
    if (config.roles.some((r: any) => r?.id === id)) {
      return NextResponse.json({ error: "Role with this id already exists" }, { status: 409 });
    }
    config.roles.push({
      id,
      name: String(body?.name ?? id).trim() || id,
      inherits: Array.isArray(body?.inherits) ? body.inherits : undefined,
    });

    const putRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/roles`, {
      method: "PUT",
      headers: {
        ...(secret ? { "x-admin-secret": secret } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    const putPayload = (await putRes.json()) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!putRes.ok || putPayload?.ok === false) {
      return NextResponse.json({ error: String(putPayload?.error ?? "Failed to update roles in Hub") }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const baseUrl =
      process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000";
    const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
    const body = await request.json();
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/roles`, {
      method: "PUT",
      headers: {
        ...(secret ? { "x-admin-secret": secret } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!res.ok || payload?.ok === false) {
      return NextResponse.json({ error: String(payload?.error ?? "Failed to update roles") }, { status: 500 });
    }
    return NextResponse.json(payload.config);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update roles config" },
      { status: 500 }
    );
  }
}

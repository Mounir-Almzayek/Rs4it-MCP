import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
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
    config.roles = Array.isArray(config.roles) ? config.roles : [];
    const idx = config.roles.findIndex((r: any) => r?.id === id);
    if (idx === -1) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const existing = config.roles[idx];
    config.roles[idx] = {
      ...existing,
      name: body?.name !== undefined ? body.name : existing?.name,
      inherits: body?.inherits !== undefined ? body.inherits : existing?.inherits,
    };

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
      return NextResponse.json({ error: String(putPayload?.error ?? "Failed to update role") }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
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

    config.roles = Array.isArray(config.roles) ? config.roles : [];
    const idx = config.roles.findIndex((r: any) => r?.id === id);
    if (idx === -1) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    config.roles.splice(idx, 1);
    if (config.defaultRole === id) config.defaultRole = undefined;

    const putRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/roles`, {
      method: "PUT",
      headers: {
        ...(secret ? { "x-admin-secret": secret } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    const putPayload = (await putRes.json()) as { ok?: boolean; error?: unknown };
    if (!putRes.ok || putPayload?.ok === false) {
      return NextResponse.json({ error: String(putPayload?.error ?? "Failed to delete role") }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}

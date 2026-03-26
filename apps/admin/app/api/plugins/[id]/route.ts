import { NextRequest, NextResponse } from "next/server";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
import { validateAllowedRoles } from "@/lib/validate";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicPluginEntry>;
    if (body.allowedRoles !== undefined) {
      const rolesValidation = await validateAllowedRoles(body.allowedRoles);
      if (!rolesValidation.ok) {
        return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
      }
      body.allowedRoles = rolesValidation.value;
    }
    const res = await fetch(`${hubBaseUrl()}/api/plugins-config`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; plugins?: any[] };
    const plugins = Array.isArray(payload?.plugins) ? payload.plugins : [];
    const idx = plugins.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    const existing = plugins[idx];
    plugins[idx] = {
      ...existing,
      ...body,
      id: body.id ?? existing.id,
      command: body.command ?? existing.command,
      args: Array.isArray(body.args) ? body.args : existing.args,
      cwd: body.cwd !== undefined ? body.cwd : existing.cwd,
      env: body.env !== undefined ? body.env : existing.env,
      timeout: body.timeout !== undefined ? body.timeout : existing.timeout,
      allowedRoles: body.allowedRoles !== undefined ? (body.allowedRoles as string[] | undefined) : existing.allowedRoles,
      source: body.source !== undefined ? body.source : existing.source,
      origin: body.origin !== undefined ? body.origin : existing.origin,
    };
    await fetch(`${hubBaseUrl()}/api/plugins-config`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ plugins }),
      cache: "no-store",
    });
    return NextResponse.json(plugins[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update plugin" },
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
    const res = await fetch(`${hubBaseUrl()}/api/plugins-config`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; plugins?: any[] };
    const plugins = Array.isArray(payload?.plugins) ? payload.plugins : [];
    const idx = plugins.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    plugins.splice(idx, 1);
    await fetch(`${hubBaseUrl()}/api/plugins-config`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ plugins }),
      cache: "no-store",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete plugin" },
      { status: 500 }
    );
  }
}

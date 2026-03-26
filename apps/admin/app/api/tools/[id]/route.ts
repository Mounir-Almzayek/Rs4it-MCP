import { NextRequest, NextResponse } from "next/server";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import { validateAllowedRoles } from "@/lib/validate";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

async function readHubRegistry(): Promise<any> {
  const res = await fetch(`${hubBaseUrl()}/api/registry`, { headers: hubHeaders(), cache: "no-store" });
  const payload = (await res.json()) as { ok?: boolean; registry?: any };
  return payload.registry ?? { tools: [], plugins: [], resources: [], rules: [] };
}

async function writeHubRegistry(registry: any): Promise<void> {
  await fetch(`${hubBaseUrl()}/api/registry`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ registry }),
    cache: "no-store",
  });
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicToolEntry>;
    if (body.allowedRoles !== undefined) {
      const rolesValidation = await validateAllowedRoles(body.allowedRoles);
      if (!rolesValidation.ok) {
        return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
      }
      body.allowedRoles = rolesValidation.value;
    }
    const registry = await readHubRegistry();
    const idx = registry.tools.findIndex((t: any) => t.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    const existing = registry.tools[idx];
    registry.tools[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      updatedAt: new Date().toISOString(),
      allowedRoles: body.allowedRoles !== undefined ? (body.allowedRoles as string[] | undefined) : existing.allowedRoles,
      source: body.source !== undefined ? body.source : existing.source,
      origin: body.origin !== undefined ? body.origin : existing.origin,
    };
    await writeHubRegistry(registry);
    return NextResponse.json(registry.tools[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update tool" },
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
    const registry = await readHubRegistry();
    const idx = registry.tools.findIndex((t: any) => t.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    registry.tools.splice(idx, 1);
    await writeHubRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { DynamicPromptEntry } from "@/lib/registry";
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
  return payload.registry ?? { tools: [], skills: [], plugins: [], prompts: [], resources: [], rules: [] };
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
    const body = (await _request.json()) as Partial<DynamicPromptEntry>;
    if (body.allowedRoles !== undefined) {
      const rolesValidation = await validateAllowedRoles(body.allowedRoles);
      if (!rolesValidation.ok) {
        return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
      }
      body.allowedRoles = rolesValidation.value;
    }
    const registry = await readHubRegistry();
    const idx = registry.prompts.findIndex((p: any) => p.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    const existing = registry.prompts[idx];
    registry.prompts[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      updatedAt: new Date().toISOString(),
      allowedRoles: body.allowedRoles !== undefined ? (body.allowedRoles as string[] | undefined) : existing.allowedRoles,
      source: body.source !== undefined ? body.source : existing.source,
      origin: body.origin !== undefined ? body.origin : existing.origin,
    };
    await writeHubRegistry(registry);
    return NextResponse.json(registry.prompts[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update prompt" },
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
    const idx = registry.prompts.findIndex((p: any) => p.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    registry.prompts.splice(idx, 1);
    await writeHubRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}

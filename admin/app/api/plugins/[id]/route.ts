import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicPluginEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

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
    const registry = await readRegistry();
    const idx = registry.plugins.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    const existing = registry.plugins[idx];
    registry.plugins[idx] = {
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
    await writeRegistry(registry);
    return NextResponse.json(registry.plugins[idx]);
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
    const registry = await readRegistry();
    const idx = registry.plugins.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    registry.plugins.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete plugin" },
      { status: 500 }
    );
  }
}

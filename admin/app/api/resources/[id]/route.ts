import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicResourceEntry } from "@/lib/registry";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicResourceEntry>;
    const registry = await readRegistry();
    const idx = registry.resources.findIndex((r) => r.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    const existing = registry.resources[idx];
    registry.resources[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      updatedAt: new Date().toISOString(),
      allowedRoles: body.allowedRoles !== undefined ? body.allowedRoles : existing.allowedRoles,
    };
    await writeRegistry(registry);
    return NextResponse.json(registry.resources[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update resource" },
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
    const idx = registry.resources.findIndex((r) => r.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    registry.resources.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}

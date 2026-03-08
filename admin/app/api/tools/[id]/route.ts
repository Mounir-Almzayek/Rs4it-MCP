import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicToolEntry } from "@/lib/registry";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicToolEntry>;
    const registry = await readRegistry();
    const idx = registry.tools.findIndex((t) => t.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    const existing = registry.tools[idx];
    registry.tools[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      updatedAt: new Date().toISOString(),
    };
    await writeRegistry(registry);
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
    const registry = await readRegistry();
    const idx = registry.tools.findIndex((t) => t.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    registry.tools.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}

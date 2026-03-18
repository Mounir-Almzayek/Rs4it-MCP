import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicPromptEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

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
    const registry = await readRegistry();
    const idx = registry.prompts.findIndex((p) => p.name === id);
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
    await writeRegistry(registry);
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
    const registry = await readRegistry();
    const idx = registry.prompts.findIndex((p) => p.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    registry.prompts.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}

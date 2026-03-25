import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicSkillEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicSkillEntry>;
    if (body.allowedRoles !== undefined) {
      const rolesValidation = await validateAllowedRoles(body.allowedRoles);
      if (!rolesValidation.ok) {
        return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
      }
      body.allowedRoles = rolesValidation.value;
    }
    const registry = await readRegistry();
    const idx = registry.skills.findIndex((s) => s.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    const existing = registry.skills[idx];
    const instructions =
      body.instructions !== undefined ? String(body.instructions ?? "").trim() : existing.instructions;
    if (!instructions) {
      return NextResponse.json({ error: "instructions is required" }, { status: 400 });
    }
    registry.skills[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      updatedAt: new Date().toISOString(),
      allowedRoles: body.allowedRoles !== undefined ? (body.allowedRoles as string[] | undefined) : existing.allowedRoles,
      source: body.source !== undefined ? body.source : existing.source,
      origin: body.origin !== undefined ? body.origin : existing.origin,
      instructions,
    };
    await writeRegistry(registry);
    return NextResponse.json(registry.skills[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update skill" },
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
    const idx = registry.skills.findIndex((s) => s.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    registry.skills.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    );
  }
}

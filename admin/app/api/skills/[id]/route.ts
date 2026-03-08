import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicSkillEntry } from "@/lib/registry";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await _request.json()) as Partial<DynamicSkillEntry>;
    const registry = await readRegistry();
    const idx = registry.skills.findIndex((s) => s.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    const existing = registry.skills[idx];
    registry.skills[idx] = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      steps: body.steps ?? existing.steps,
      updatedAt: new Date().toISOString(),
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

import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicRuleEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await request.json()) as Partial<DynamicRuleEntry>;
    if (body.allowedRoles !== undefined) {
      const rolesValidation = await validateAllowedRoles(body.allowedRoles);
      if (!rolesValidation.ok) {
        return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
      }
      body.allowedRoles = rolesValidation.value;
    }

    const registry = await readRegistry();
    registry.rules = Array.isArray(registry.rules) ? registry.rules : [];
    const idx = registry.rules.findIndex((r) => r.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    const existing = registry.rules[idx];
    const next: DynamicRuleEntry = {
      ...existing,
      ...body,
      name: existing.name,
      updatedAt: new Date().toISOString(),
      allowedRoles:
        body.allowedRoles !== undefined
          ? (body.allowedRoles as string[] | undefined)
          : existing.allowedRoles,
      source: body.source !== undefined ? body.source : existing.source,
      origin: body.origin !== undefined ? body.origin : existing.origin,
    };
    if (next.content !== undefined && !String(next.content ?? "").trim()) {
      return NextResponse.json({ error: "Rule content cannot be empty" }, { status: 400 });
    }
    registry.rules[idx] = next;
    await writeRegistry(registry);
    return NextResponse.json(registry.rules[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const registry = await readRegistry();
    registry.rules = Array.isArray(registry.rules) ? registry.rules : [];
    const idx = registry.rules.findIndex((r) => r.name === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    registry.rules.splice(idx, 1);
    await writeRegistry(registry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}


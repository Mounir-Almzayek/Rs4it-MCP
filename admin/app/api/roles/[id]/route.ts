import { NextRequest, NextResponse } from "next/server";
import { readRoleConfig, writeRoleConfig, type RoleDefinition } from "@/lib/roles";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  try {
    const body = (await request.json()) as Partial<RoleDefinition>;
    const config = await readRoleConfig();
    const idx = config.roles.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const existing = config.roles[idx];
    config.roles[idx] = {
      ...existing,
      name: body.name !== undefined ? body.name : existing.name,
      inherits: body.inherits !== undefined ? body.inherits : existing.inherits,
    };
    await writeRoleConfig(config);
    return NextResponse.json(config.roles[idx]);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update role" },
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
    const config = await readRoleConfig();
    const idx = config.roles.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    config.roles.splice(idx, 1);
    if (config.defaultRole === id) config.defaultRole = undefined;
    await writeRoleConfig(config);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readRoleConfig, writeRoleConfig, type RoleConfig, type RoleDefinition } from "@/lib/roles";

export async function GET() {
  try {
    const config = await readRoleConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RoleDefinition>;
    const id = (body.id ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Role id is required" },
        { status: 400 }
      );
    }
    const config = await readRoleConfig();
    if (config.roles.some((r) => r.id === id)) {
      return NextResponse.json(
        { error: "Role with this id already exists" },
        { status: 409 }
      );
    }
    const entry: RoleDefinition = {
      id,
      name: body.name?.trim() || id,
      inherits: Array.isArray(body.inherits) ? body.inherits : undefined,
    };
    config.roles.push(entry);
    await writeRoleConfig(config);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RoleConfig>;
    const config = await readRoleConfig();
    if (body.defaultRole !== undefined) config.defaultRole = body.defaultRole;
    if (Array.isArray(body.roles)) config.roles = body.roles;
    await writeRoleConfig(config);
    return NextResponse.json(config);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update roles config" },
      { status: 500 }
    );
  }
}

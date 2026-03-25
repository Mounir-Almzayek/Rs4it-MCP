import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicRuleEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.rules ?? [], { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicRuleEntry>;
    const rolesValidation = await validateAllowedRoles(body.allowedRoles);
    if (!rolesValidation.ok) {
      return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
    }

    const entry: DynamicRuleEntry = {
      name: body.name ?? "",
      description: body.description ?? "",
      content: body.content ?? "",
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      allowedRoles: rolesValidation.value,
      source: body.source === "mcp" ? "mcp" : "admin",
      origin: body.origin,
      globs: body.globs,
    };

    if (!entry.name.trim()) {
      return NextResponse.json({ error: "Rule name is required" }, { status: 400 });
    }
    if (!entry.content.trim()) {
      return NextResponse.json({ error: "Rule content is required" }, { status: 400 });
    }

    const registry = await readRegistry();
    registry.rules = Array.isArray(registry.rules) ? registry.rules : [];
    if (registry.rules.some((r) => r.name === entry.name)) {
      return NextResponse.json({ error: "Rule with this name already exists" }, { status: 409 });
    }
    registry.rules.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}


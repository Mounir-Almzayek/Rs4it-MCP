import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicPluginEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.plugins, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read plugins" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicPluginEntry>;
    const rolesValidation = await validateAllowedRoles(body.allowedRoles);
    if (!rolesValidation.ok) {
      return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
    }
    const entry: DynamicPluginEntry = {
      id: body.id ?? "",
      name: body.name ?? body.id ?? "",
      command: body.command ?? "npx",
      args: Array.isArray(body.args) ? body.args : ["-y", "package@latest"],
      description: body.description,
      enabled: body.enabled ?? true,
      cwd: body.cwd,
      env: body.env,
      timeout: body.timeout,
      allowedRoles: rolesValidation.value,
      source: body.source === "mcp" ? "mcp" : "admin",
      origin: body.origin,
    };
    const registry = await readRegistry();
    if (registry.plugins.some((p) => p.id === entry.id)) {
      return NextResponse.json(
        { error: "Plugin with this id already exists" },
        { status: 409 }
      );
    }
    registry.plugins.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create plugin" },
      { status: 500 }
    );
  }
}

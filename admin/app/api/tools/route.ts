import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicToolEntry } from "@/lib/registry";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.tools, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read tools" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicToolEntry>;
    const entry: DynamicToolEntry = {
      name: body.name ?? "",
      description: body.description ?? "",
      inputSchema: body.inputSchema ?? {},
      handlerRef: body.handlerRef ?? "",
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      allowedRoles: Array.isArray(body.allowedRoles) ? body.allowedRoles : undefined,
      source: body.source === "mcp" ? "mcp" : "admin",
      origin: body.origin,
    };
    const registry = await readRegistry();
    if (registry.tools.some((t) => t.name === entry.name)) {
      return NextResponse.json(
        { error: "Tool with this name already exists" },
        { status: 409 }
      );
    }
    registry.tools.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}

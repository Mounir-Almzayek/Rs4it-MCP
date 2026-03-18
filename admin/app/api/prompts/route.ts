import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicPromptEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.prompts, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read prompts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicPromptEntry>;
    const rolesValidation = await validateAllowedRoles(body.allowedRoles);
    if (!rolesValidation.ok) {
      return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
    }
    const entry: DynamicPromptEntry = {
      name: body.name ?? "",
      title: body.title,
      description: body.description ?? "",
      argsSchema: body.argsSchema,
      template: body.template ?? "",
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      allowedRoles: rolesValidation.value,
      source: body.source === "mcp" ? "mcp" : "admin",
      origin: body.origin,
    };
    const registry = await readRegistry();
    if (registry.prompts.some((p) => p.name === entry.name)) {
      return NextResponse.json(
        { error: "Prompt with this name already exists" },
        { status: 409 }
      );
    }
    registry.prompts.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

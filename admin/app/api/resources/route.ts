import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicResourceEntry } from "@/lib/registry";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.resources, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read resources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicResourceEntry>;
    const entry: DynamicResourceEntry = {
      name: body.name ?? "",
      uri: body.uri ?? "",
      description: body.description,
      mimeType: body.mimeType ?? "text/plain",
      content: body.content ?? "",
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      allowedRoles: Array.isArray(body.allowedRoles) ? body.allowedRoles : undefined,
    };
    const registry = await readRegistry();
    if (registry.resources.some((r) => r.name === entry.name)) {
      return NextResponse.json(
        { error: "Resource with this name already exists" },
        { status: 409 }
      );
    }
    registry.resources.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}

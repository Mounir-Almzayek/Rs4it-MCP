import { NextRequest, NextResponse } from "next/server";
import type { DynamicResourceEntry } from "@/lib/registry";
import { validateAllowedRoles } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" };

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

async function readHubRegistry(): Promise<any> {
  const res = await fetch(`${hubBaseUrl()}/api/registry`, { headers: hubHeaders(), cache: "no-store" });
  const payload = (await res.json()) as { ok?: boolean; registry?: any };
  return payload.registry ?? { tools: [], skills: [], plugins: [], prompts: [], resources: [], rules: [] };
}

async function writeHubRegistry(registry: any): Promise<void> {
  await fetch(`${hubBaseUrl()}/api/registry`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ registry }),
    cache: "no-store",
  });
}

export async function GET() {
  try {
    const registry = await readHubRegistry();
    return NextResponse.json(registry.resources ?? [], { headers: NO_STORE });
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
    const rolesValidation = await validateAllowedRoles(body.allowedRoles);
    if (!rolesValidation.ok) {
      return NextResponse.json({ error: rolesValidation.error }, { status: 400 });
    }
    const entry: DynamicResourceEntry = {
      name: body.name ?? "",
      uri: body.uri ?? "",
      description: body.description,
      mimeType: body.mimeType ?? "text/plain",
      content: body.content ?? "",
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      allowedRoles: rolesValidation.value,
      source: body.source === "mcp" ? "mcp" : "admin",
      origin: body.origin,
    };
    const registry = await readHubRegistry();
    if (registry.resources.some((r: any) => r.name === entry.name)) {
      return NextResponse.json(
        { error: "Resource with this name already exists" },
        { status: 409 }
      );
    }
    registry.resources.push(entry);
    await writeHubRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}

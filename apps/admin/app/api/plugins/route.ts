import { NextRequest, NextResponse } from "next/server";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
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

export async function GET() {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/plugins-config`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; plugins?: unknown };
    const plugins = Array.isArray(payload?.plugins) ? payload.plugins : [];
    return NextResponse.json(plugins, { headers: NO_STORE });
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
    const res = await fetch(`${hubBaseUrl()}/api/plugins-config`, { headers: hubHeaders(), cache: "no-store" });
    const payload = (await res.json()) as { ok?: boolean; plugins?: any[] };
    const plugins = Array.isArray(payload?.plugins) ? payload.plugins : [];
    if (plugins.some((p) => p.id === entry.id)) {
      return NextResponse.json(
        { error: "Plugin with this id already exists" },
        { status: 409 }
      );
    }
    plugins.push(entry as any);
    await fetch(`${hubBaseUrl()}/api/plugins-config`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ plugins }),
      cache: "no-store",
    });
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create plugin" },
      { status: 500 }
    );
  }
}

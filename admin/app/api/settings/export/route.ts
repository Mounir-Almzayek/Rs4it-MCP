import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { readRoleConfig } from "@/lib/roles";
import { readRegistry } from "@/lib/registry";

type ExportItemKey = "roles" | "dynamicRegistry" | "mcpPlugins";

interface ExportRequestBody {
  include?: ExportItemKey[];
}

interface ExportPayload {
  version: number;
  exportedAt: string;
  items: {
    roles?: unknown;
    dynamicRegistry?: unknown;
    mcpPlugins?: unknown;
  };
}

function getPluginsConfigPath(): string {
  const env = process.env.MCP_PLUGINS_CONFIG ?? process.env.ADMIN_MCP_PLUGINS_CONFIG;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "..", "config", "mcp_plugins.json");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ExportRequestBody;
    const include = (body.include && body.include.length > 0
      ? body.include
      : (["roles", "dynamicRegistry", "mcpPlugins"] as ExportItemKey[])
    ).filter(
      (k, idx, arr): k is ExportItemKey => ["roles", "dynamicRegistry", "mcpPlugins"].includes(k) && arr.indexOf(k) === idx
    );

    const items: ExportPayload["items"] = {};

    if (include.includes("roles")) {
      const roles = await readRoleConfig();
      items.roles = roles;
    }

    if (include.includes("dynamicRegistry")) {
      const registry = await readRegistry();
      items.dynamicRegistry = registry;
    }

    if (include.includes("mcpPlugins")) {
      const pluginsPath = getPluginsConfigPath();
      try {
        const raw = await fs.readFile(pluginsPath, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        items.mcpPlugins = parsed;
      } catch {
        items.mcpPlugins = { plugins: [] };
      }
    }

    const payload: ExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    };

    const json = JSON.stringify(payload, null, 2);
    const response = new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rs4it-hub-settings.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export settings" },
      { status: 500 }
    );
  }
}


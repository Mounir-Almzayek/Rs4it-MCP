import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { readRoleConfig, writeRoleConfig, type RoleConfig } from "@/lib/roles";
import { readRegistry, writeRegistry, type DynamicRegistry } from "@/lib/registry";

type ImportItemKey = "roles" | "dynamicRegistry" | "mcpPlugins";

interface ImportPayload {
  version?: number;
  items?: {
    roles?: unknown;
    dynamicRegistry?: unknown;
    mcpPlugins?: unknown;
  };
  include?: ImportItemKey[];
}

function getPluginsConfigPath(): string {
  const env = process.env.MCP_PLUGINS_CONFIG ?? process.env.ADMIN_MCP_PLUGINS_CONFIG;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "..", "config", "mcp_plugins.json");
}

function isRoleConfig(value: unknown): value is RoleConfig {
  return !!value && typeof value === "object" && Array.isArray((value as RoleConfig).roles);
}

function isDynamicRegistry(value: unknown): value is DynamicRegistry {
  if (!value || typeof value !== "object") return false;
  const o = value as DynamicRegistry;
  return (
    Array.isArray(o.tools) &&
    Array.isArray(o.skills) &&
    Array.isArray(o.plugins) &&
    Array.isArray(o.prompts) &&
    Array.isArray(o.resources)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportPayload;
    if (!body || typeof body !== "object" || !body.items) {
      return NextResponse.json(
        { error: "Invalid payload: missing items" },
        { status: 400 }
      );
    }

    const availableKeys: ImportItemKey[] = [];
    if (body.items.roles !== undefined) availableKeys.push("roles");
    if (body.items.dynamicRegistry !== undefined) availableKeys.push("dynamicRegistry");
    if (body.items.mcpPlugins !== undefined) availableKeys.push("mcpPlugins");

    if (availableKeys.length === 0) {
      return NextResponse.json(
        { error: "No importable items present in payload" },
        { status: 400 }
      );
    }

    const include = (body.include && body.include.length > 0
      ? body.include
      : availableKeys
    ).filter(
      (k, idx, arr): k is ImportItemKey =>
        availableKeys.includes(k) && arr.indexOf(k) === idx
    );

    const applied: ImportItemKey[] = [];

    if (include.includes("roles") && body.items.roles !== undefined) {
      const incoming = body.items.roles;
      if (!isRoleConfig(incoming)) {
        return NextResponse.json(
          { error: "Invalid roles format in payload" },
          { status: 400 }
        );
      }
      const current = await readRoleConfig();
      const next: RoleConfig = {
        defaultRole: incoming.defaultRole ?? current.defaultRole,
        roles: incoming.roles,
      };
      await writeRoleConfig(next);
      applied.push("roles");
    }

    if (include.includes("dynamicRegistry") && body.items.dynamicRegistry !== undefined) {
      const incoming = body.items.dynamicRegistry;
      if (!isDynamicRegistry(incoming)) {
        return NextResponse.json(
          { error: "Invalid dynamicRegistry format in payload" },
          { status: 400 }
        );
      }
      await writeRegistry(incoming);
      applied.push("dynamicRegistry");
    }

    if (include.includes("mcpPlugins") && body.items.mcpPlugins !== undefined) {
      const pluginsPath = getPluginsConfigPath();
      const content = JSON.stringify(body.items.mcpPlugins, null, 2);
      await fs.mkdir(path.dirname(pluginsPath), { recursive: true });
      await fs.writeFile(pluginsPath, content, "utf-8");
      applied.push("mcpPlugins");
    }

    return NextResponse.json({
      ok: true,
      applied,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to import settings" },
      { status: 500 }
    );
  }
}


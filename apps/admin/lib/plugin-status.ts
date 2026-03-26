/**
 * Admin: read plugin connection status written by the Hub at startup.
 * Same file as Hub writes (config/mcp_plugin_status.json or MCP_PLUGIN_STATUS_FILE).
 */

import path from "path";
import fs from "fs/promises";

export interface PluginToolRef {
  name: string;
  originalName?: string;
  description?: string;
}

export interface PluginConnectionEntry {
  id: string;
  name: string;
  status: "connected" | "failed";
  toolsCount?: number;
  tools?: PluginToolRef[];
  error?: string;
}

export interface PluginStatusSnapshot {
  updatedAt: string;
  plugins: PluginConnectionEntry[];
}

function getPluginStatusPathCandidates(): string[] {
  const env = process.env.MCP_PLUGIN_STATUS_FILE ?? process.env.ADMIN_MCP_PLUGIN_STATUS_FILE;
  if (env) return [path.resolve(env)];
  const cwd = process.cwd();
  return [
    path.resolve(cwd, "config", "mcp_plugin_status.json"),
    path.resolve(cwd, "..", "config", "mcp_plugin_status.json"),
    path.resolve(cwd, "..", "..", "config", "mcp_plugin_status.json"),
  ];
}

export async function readPluginStatus(): Promise<PluginStatusSnapshot | null> {
  const candidates = getPluginStatusPathCandidates();
  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as unknown;
      if (!data || typeof data !== "object" || !("plugins" in data)) continue;
      const snap = data as { updatedAt?: string; plugins?: unknown[] };
      const plugins = Array.isArray(snap.plugins)
        ? snap.plugins.filter(
            (x): x is PluginConnectionEntry =>
              !!x &&
              typeof x === "object" &&
              typeof (x as unknown as Record<string, unknown>).id === "string" &&
              typeof (x as unknown as Record<string, unknown>).name === "string" &&
              ((x as unknown as Record<string, unknown>).status === "connected" ||
                (x as unknown as Record<string, unknown>).status === "failed")
          )
        : [];
      for (const p of plugins) {
        if (Array.isArray(p.tools)) {
          p.tools = p.tools.filter(
            (t): t is PluginToolRef =>
              !!t && typeof t === "object" && typeof (t as unknown as Record<string, unknown>).name === "string"
          );
        }
      }
      return {
        updatedAt: typeof snap.updatedAt === "string" ? snap.updatedAt : new Date().toISOString(),
        plugins,
      };
    } catch {
      continue;
    }
  }
  return null;
}

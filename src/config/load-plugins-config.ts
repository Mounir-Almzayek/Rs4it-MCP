/**
 * Load and validate MCP plugins config (Phase 04).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { McpPluginsConfig, PluginConfig } from "../plugins/types.js";

const DEFAULT_CONFIG_PATH = "config/mcp_plugins.json";

/**
 * Resolve config path: MCP_PLUGINS_CONFIG env or default relative to cwd.
 */
export function getPluginsConfigPath(): string {
  const env = process.env["MCP_PLUGINS_CONFIG"];
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * Load and parse config. Returns empty list if file missing or invalid.
 */
export async function loadPluginsConfig(): Promise<PluginConfig[]> {
  const configPath = getPluginsConfigPath();
  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!data || typeof data !== "object" || !("plugins" in data)) {
    return [];
  }
  const plugins = (data as McpPluginsConfig).plugins;
  if (!Array.isArray(plugins)) return [];
  return plugins.filter(
    (p): p is PluginConfig =>
      p &&
      typeof p === "object" &&
      typeof p.id === "string" &&
      typeof p.name === "string" &&
      typeof p.command === "string" &&
      Array.isArray(p.args)
  );
}

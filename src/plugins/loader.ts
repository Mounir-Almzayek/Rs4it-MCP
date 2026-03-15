/**
 * Plugin loader: spawn external MCP plugins via NPX, connect as client, manage lifecycle (Phase 04 + 08).
 * Writes connection status to config/mcp_plugin_status.json for Admin to show.
 */

import { loadPluginsConfig } from "../config/load-plugins-config.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { writePluginStatus } from "../config/plugin-status-store.js";
import type { LoadedPlugin, PluginConfig, PluginTool } from "./types.js";
import { createPluginClient } from "./client.js";

const loaded = new Map<string, LoadedPlugin>();

/**
 * Merged plugin configs: static (mcp_plugins.json) + enabled dynamic registry plugins.
 */
async function getMergedPluginConfigs(): Promise<PluginConfig[]> {
  const [staticConfigs, dynamic] = await Promise.all([
    loadPluginsConfig(),
    loadDynamicRegistry(),
  ]);
  const dynamicConfigs: PluginConfig[] = dynamic.plugins
    .filter((p) => p.enabled)
    .map((p) => ({
      id: p.id,
      name: p.name,
      command: p.command,
      args: p.args,
      cwd: p.cwd,
      env: p.env,
      timeout: p.timeout,
    }));
  return [...staticConfigs, ...dynamicConfigs];
}

/**
 * Load all plugins from config. Call once at startup.
 * Failed plugins are logged and skipped; Hub continues without them.
 * Writes connection status (connected/failed + error) to plugin status file for Admin.
 */
export async function loadAllPlugins(): Promise<void> {
  const configs = await getMergedPluginConfigs();
  const statusEntries: Array<{ id: string; name: string; status: "connected" | "failed"; toolsCount?: number; tools?: Array<{ name: string; originalName?: string; description?: string }>; error?: string }> = [];

  for (const config of configs) {
    if (loaded.has(config.id)) {
      const existing = loaded.get(config.id)!;
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "connected",
        toolsCount: existing.tools.length,
        tools: existing.tools.map((t) => ({ name: t.name, originalName: t.originalName, description: t.description })),
      });
      continue;
    }
    const result = await createPluginClient(config);
    if (result.ok) {
      const loadedPlugin: LoadedPlugin = {
        id: config.id,
        name: config.name,
        tools: result.tools,
        callTool: result.callTool,
        close: result.close,
      };
      loaded.set(config.id, loadedPlugin);
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "connected",
        toolsCount: result.tools.length,
        tools: result.tools.map((t) => ({ name: t.name, originalName: t.originalName, description: t.description })),
      });
    } else {
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "failed",
        error: result.error,
      });
    }
  }

  await writePluginStatus(statusEntries);
}

/**
 * Return all loaded plugins (for Phase 05 to merge tools).
 */
export function getLoadedPlugins(): LoadedPlugin[] {
  return Array.from(loaded.values());
}

/**
 * Return all tools from all plugins (prefixed names).
 */
export function getAllPluginTools(): PluginTool[] {
  return getLoadedPlugins().flatMap((p) => p.tools);
}

/**
 * Call a tool on a plugin. Tool name must be the original name (not prefixed); plugin id identifies the plugin.
 */
export async function callPluginTool(
  pluginId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
  const plugin = loaded.get(pluginId);
  if (!plugin) {
    return {
      content: [{ type: "text", text: `Plugin not available: ${pluginId}` }],
      isError: true,
    };
  }
  return plugin.callTool(toolName, args);
}

/**
 * Close all plugin processes. Call on Hub shutdown.
 */
export async function closeAllPlugins(): Promise<void> {
  const closePromises = Array.from(loaded.values()).map((p) => p.close());
  loaded.clear();
  await Promise.allSettled(closePromises);
}

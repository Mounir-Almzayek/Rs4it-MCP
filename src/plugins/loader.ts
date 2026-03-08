/**
 * Plugin loader: spawn external MCP plugins via NPX, connect as client, manage lifecycle (Phase 04).
 */

import { loadPluginsConfig } from "../config/load-plugins-config.js";
import type { LoadedPlugin, PluginConfig, PluginTool } from "./types.js";
import { createPluginClient } from "./client.js";

const loaded = new Map<string, LoadedPlugin>();

/**
 * Load all plugins from config. Call once at startup.
 * Failed plugins are logged and skipped; Hub continues without them.
 */
export async function loadAllPlugins(): Promise<void> {
  const configs = await loadPluginsConfig();
  for (const config of configs) {
    if (loaded.has(config.id)) continue;
    const clientResult = await createPluginClient(config);
    if (!clientResult) continue;
    const loadedPlugin: LoadedPlugin = {
      id: config.id,
      name: config.name,
      tools: clientResult.tools,
      callTool: clientResult.callTool,
      close: clientResult.close,
    };
    loaded.set(config.id, loadedPlugin);
  }
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

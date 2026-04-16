/**
 * Plugin loader: spawn external MCP plugins via NPX, connect as client, manage lifecycle (Phase 04 + 08).
 * Writes connection status to config/mcp_plugin_status.json for Admin to show.
 */

import { loadPluginsConfig } from "../config/load-plugins-config.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { writePluginStatus } from "../config/plugin-status-store.js";
import { prisma } from "../db/prisma.js";
import type { LoadedPlugin, PluginConfig, PluginTool } from "./types.js";
import { createPluginClient } from "./client.js";

const loaded = new Map<string, LoadedPlugin>();

function dedupePluginConfigs(configs: PluginConfig[]): PluginConfig[] {
  const byId = new Map<string, PluginConfig>();
  for (const cfg of configs) byId.set(cfg.id, cfg);
  return Array.from(byId.values());
}

async function syncPluginRegistryContent(plugins: LoadedPlugin[], pluginAllowedMap: Map<string, string[]>): Promise<void> {
  const resourcesData: Array<{
    name: string;
    uri: string;
    description: string | null;
    mimeType: string;
    content: string;
    enabled: boolean;
    allowedRoles: any;
    source: "mcp";
    origin: string;
  }> = [];
  const promptsData: Array<{
    name: string;
    description: string | null;
    content: string;
    enabled: boolean;
    allowedRoles: any;
    source: "mcp";
    origin: string;
  }> = [];

  for (const plugin of plugins) {
    const allowedRoles = pluginAllowedMap.get(plugin.id) ?? [];
    for (const r of plugin.resources) {
      const out = plugin.readResource ? await plugin.readResource(r.originalUri) : { contents: [] as Array<{ text?: string }> };
      const text = (out.contents ?? []).map((c) => c.text ?? "").filter(Boolean).join("\n").trim();
      resourcesData.push({
        name: r.name,
        uri: r.uri,
        description: r.description ?? null,
        mimeType: r.mimeType ?? "text/plain",
        content: text,
        enabled: true,
        allowedRoles: (allowedRoles.length > 0 ? allowedRoles : null) as any,
        source: "mcp",
        origin: plugin.id,
      });
    }
    for (const p of plugin.prompts) {
      const prompt = plugin.readPrompt ? await plugin.readPrompt(p.originalName) : { content: "" };
      promptsData.push({
        name: p.name,
        description: prompt.description ?? p.description ?? null,
        content: prompt.content ?? "",
        enabled: true,
        allowedRoles: (allowedRoles.length > 0 ? allowedRoles : null) as any,
        source: "mcp",
        origin: plugin.id,
      });
    }
  }

  await prisma.registryResource.deleteMany({ where: { source: "mcp" } });
  await prisma.registryPrompt.deleteMany({ where: { source: "mcp" } });

  const BATCH_SIZE = 100;
  for (let i = 0; i < resourcesData.length; i += BATCH_SIZE) {
    await prisma.registryResource.createMany({ data: resourcesData.slice(i, i + BATCH_SIZE) });
  }
  for (let i = 0; i < promptsData.length; i += BATCH_SIZE) {
    await prisma.registryPrompt.createMany({ data: promptsData.slice(i, i + BATCH_SIZE) });
  }
}

/**
 * Load all plugins from config. Call once at startup.
 * Failed plugins are logged and skipped; Hub continues without them.
 * Writes connection status (connected/failed + error) to plugin status file for Admin.
 * Plugin allowedRoles from dynamic registry are written so Admin can show them for tools/resources.
 */
export async function loadAllPlugins(): Promise<void> {
  const [configs, dynamic] = await Promise.all([
    loadPluginsConfig(),
    loadDynamicRegistry(),
  ]);
  const uniqueConfigs = dedupePluginConfigs(configs);
  const pluginAllowedMap = new Map<string, string[]>();
  for (const p of dynamic.plugins) {
    if (Array.isArray(p.allowedRoles) && p.allowedRoles.length > 0) {
      pluginAllowedMap.set(p.id, p.allowedRoles);
    }
  }
  const statusEntries: Array<{
    id: string;
    name: string;
    status: "connected" | "failed";
    toolsCount?: number;
    tools?: Array<{ name: string; originalName?: string; description?: string }>;
    resourcesCount?: number;
    resources?: Array<{ name: string; originalName?: string; uri: string; description?: string; mimeType?: string }>;
    promptsCount?: number;
    prompts?: Array<{ name: string; originalName?: string; description?: string }>;
    allowedRoles?: string[];
    error?: string;
  }> = [];
  const emittedIds = new Set<string>();

  for (const config of uniqueConfigs) {
    if (emittedIds.has(config.id)) continue;
    emittedIds.add(config.id);
    const allowedRoles = pluginAllowedMap.get(config.id) ?? [];
    if (loaded.has(config.id)) {
      const existing = loaded.get(config.id)!;
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "connected",
        toolsCount: existing.tools.length,
        tools: existing.tools.map((t) => ({ name: t.name, originalName: t.originalName, description: t.description })),
        resourcesCount: existing.resources.length,
        resources: existing.resources.map((r) => ({ name: r.name, originalName: r.originalName, uri: r.uri, description: r.description, mimeType: r.mimeType })),
        promptsCount: existing.prompts.length,
        prompts: existing.prompts.map((p) => ({ name: p.name, originalName: p.originalName, description: p.description })),
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined,
      });
      continue;
    }
    const result = await createPluginClient(config);
    if (result.ok) {
      const loadedPlugin: LoadedPlugin = {
        id: config.id,
        name: config.name,
        tools: result.tools,
        resources: result.resources,
        prompts: result.prompts,
        callTool: result.callTool,
        readResource: result.readResource,
        readPrompt: result.readPrompt,
        close: result.close,
      };
      loaded.set(config.id, loadedPlugin);
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "connected",
        toolsCount: result.tools.length,
        tools: result.tools.map((t) => ({ name: t.name, originalName: t.originalName, description: t.description })),
        resourcesCount: result.resources.length,
        resources: result.resources.map((r) => ({ name: r.name, originalName: r.originalName, uri: r.uri, description: r.description, mimeType: r.mimeType })),
        promptsCount: result.prompts.length,
        prompts: result.prompts.map((p) => ({ name: p.name, originalName: p.originalName, description: p.description })),
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined,
      });
    } else {
      statusEntries.push({
        id: config.id,
        name: config.name,
        status: "failed",
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined,
        error: result.error,
      });
    }
  }

  await syncPluginRegistryContent(getLoadedPlugins(), pluginAllowedMap);
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
 * Read a resource from a plugin. uriOrOriginalUri: the plugin's original URI (or virtual URI resolved to original).
 */
export async function readPluginResource(
  pluginId: string,
  originalUri: string
): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }> {
  const plugin = loaded.get(pluginId);
  if (!plugin?.readResource) {
    return { contents: [{ uri: originalUri, text: `Plugin or readResource not available: ${pluginId}` }] };
  }
  return plugin.readResource(originalUri);
}

/**
 * Close all plugin processes. Call on Hub shutdown.
 */
export async function closeAllPlugins(): Promise<void> {
  const closePromises = Array.from(loaded.values()).map((p) => p.close());
  loaded.clear();
  await Promise.allSettled(closePromises);
}

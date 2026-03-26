/**
 * Built-in resource: rs4it://registry — JSON summary of available tools and plugins.
 * Phase 13.
 */

import type { URL } from "node:url";
import { getAllTools } from "../tools/index.js";
import { getLoadedPlugins } from "../plugins/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";

export const REGISTRY_RESOURCE_URI = "rs4it://registry";
export const REGISTRY_RESOURCE_NAME = "hub_registry";

export async function readRegistryResource(_uri: URL): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  const dynamic = await loadDynamicRegistry();
  const plugins = getLoadedPlugins().map((p) => ({
    id: p.id,
    name: p.name,
    tools: p.tools.map((t) => t.name),
  }));

  const tools = getAllTools().map((t) => ({ name: t.name, description: t.description }));
  const summary = {
    builtIn: { tools },
    dynamic: {
      tools: dynamic.tools.filter((t) => t.enabled).map((t) => ({ name: t.name, description: t.description })),
      rules: (dynamic.rules ?? []).filter((r) => r.enabled).map((r) => ({ name: `rule:${r.name}`, description: r.description })),
    },
    plugins,
    updatedAt: new Date().toISOString(),
  };
  return {
    contents: [
      {
        uri: REGISTRY_RESOURCE_URI,
        mimeType: "application/json",
        text: JSON.stringify(summary, null, 2),
      },
    ],
  };
}

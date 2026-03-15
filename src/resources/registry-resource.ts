/**
 * Built-in resource: rs4it://registry — JSON summary of available tools, skills, and plugins.
 * Phase 13.
 */

import type { URL } from "node:url";
import { getAllTools } from "../tools/index.js";
import { getAllSkills, skillToToolName } from "../skills/index.js";
import { getLoadedPlugins } from "../plugins/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";

export const REGISTRY_RESOURCE_URI = "rs4it://registry";
export const REGISTRY_RESOURCE_NAME = "hub_registry";

export async function readRegistryResource(_uri: URL): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  const dynamic = await loadDynamicRegistry();
  const dynamicPluginEnabled = new Map(dynamic.plugins.map((p) => [p.id, p.enabled !== false]));
  const plugins = getLoadedPlugins()
    .filter((p) => (dynamicPluginEnabled.has(p.id) ? dynamicPluginEnabled.get(p.id) : true))
    .map((p) => ({
      id: p.id,
      name: p.name,
      tools: p.tools.map((t) => t.name),
    }));

  const tools = getAllTools().map((t) => ({ name: t.name, description: t.description }));
  const skills = getAllSkills().map((s) => ({
    name: skillToToolName(s.name),
    description: s.description,
  }));
  const summary = {
    builtIn: { tools, skills },
    dynamic: {
      tools: dynamic.tools.filter((t) => t.enabled).map((t) => ({ name: t.name, description: t.description })),
      skills: dynamic.skills.filter((s) => s.enabled).map((s) => ({ name: `skill:${s.name}`, description: s.description })),
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

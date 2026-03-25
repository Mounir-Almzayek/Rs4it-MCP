import { getAllTools } from "../tools/index.js";
import { getAllSkills, skillToToolName } from "../skills/index.js";
import { getLoadedPlugins } from "../plugins/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { isAllowedForRole } from "../config/roles.js";

export type ToolCatalogItem = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  source: "built-in" | "dynamic" | "plugin";
};

/**
 * Build the tool catalog, optionally filtered by role.
 * When role is set, only tools/skills allowed for that role (or visible to all) are included.
 */
export async function buildToolCatalog(role?: string): Promise<ToolCatalogItem[]> {
  const out: ToolCatalogItem[] = [];

  for (const t of getAllTools()) {
    out.push({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
      source: "built-in",
    });
  }

  for (const s of getAllSkills()) {
    out.push({
      name: skillToToolName(s.name),
      description: `[Skill] ${s.description}`,
      inputSchema: s.inputSchema as Record<string, unknown>,
      source: "built-in",
    });
  }

  const dynamic = await loadDynamicRegistry();
  for (const t of dynamic.tools) {
    if (!t.enabled) continue;
    if (role && !(await isAllowedForRole(t.allowedRoles, role))) continue;
    out.push({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      source: "dynamic",
    });
  }
  for (const s of dynamic.skills) {
    if (!s.enabled) continue;
    if (role && !(await isAllowedForRole(s.allowedRoles, role))) continue;
    out.push({
      name: skillToToolName(s.name),
      description: `[Skill] ${s.description}`,
      inputSchema: {},
      source: "dynamic",
    });
  }

  // Plugins: apply the same allowedRoles visibility rule as the Hub does.
  // Without this, the compiler may generate steps targeting plugin tools that the
  // given role would not see at runtime.
  const pluginAllowedMap = new Map<string, string[]>();
  for (const p of dynamic.plugins) {
    if (Array.isArray(p.allowedRoles) && p.allowedRoles.length > 0) {
      pluginAllowedMap.set(p.id, p.allowedRoles);
    }
  }

  for (const plugin of getLoadedPlugins()) {
    if (role) {
      const allowed = pluginAllowedMap.get(plugin.id);
      if (allowed !== undefined && !(await isAllowedForRole(allowed, role))) continue;
    }
    for (const t of plugin.tools) {
      out.push({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
        source: "plugin",
      });
    }
    for (const s of plugin.skills) {
      out.push({
        name: s.name,
        description: s.description,
        inputSchema: s.inputSchema as Record<string, unknown> | undefined,
        source: "plugin",
      });
    }
  }

  // Ensure unique names; keep first occurrence.
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
}


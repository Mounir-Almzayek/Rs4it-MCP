import { getAllTools } from "../tools/index.js";
import { getAllSkills, skillToToolName } from "../skills/index.js";
import { getLoadedPlugins } from "../plugins/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";

export type ToolCatalogItem = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  source: "built-in" | "dynamic" | "plugin";
};

export async function buildToolCatalog(): Promise<ToolCatalogItem[]> {
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
    out.push({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      source: "dynamic",
    });
  }
  for (const s of dynamic.skills) {
    if (!s.enabled) continue;
    out.push({
      name: skillToToolName(s.name),
      description: `[Skill] ${s.description}`,
      inputSchema: s.inputSchema,
      source: "dynamic",
    });
  }

  for (const p of getLoadedPlugins()) {
    for (const t of p.tools) {
      out.push({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
        source: "plugin",
      });
    }
    for (const s of p.skills) {
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


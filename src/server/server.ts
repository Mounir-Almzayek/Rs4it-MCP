/**
 * MCP Server layer (Phase 01 + 02 + 03 + 05 + 08 + 09).
 * Builds the McpServer with serverInfo, capabilities, and merged tools (local + skills + plugins + dynamic).
 * Optional role filters tools/list by allowedRoles (with role inheritance).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SERVER_NAME,
  SERVER_VERSION,
  DEFAULT_CAPABILITIES,
} from "../config/constants.js";
import {
  registerBuiltInTools,
  getAllTools,
  executeTool,
} from "../tools/index.js";
import {
  registerBuiltInSkills,
  getAllSkills,
  executeSkill,
  skillToToolName,
} from "../skills/index.js";
import { getLoadedPlugins, callPluginTool } from "../plugins/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { isAllowedForRole } from "../config/roles.js";
import { PLUGIN_TOOL_PREFIX } from "../plugins/constants.js";
import type { DynamicSkillStep } from "../types/dynamic-registry.js";

export interface CreateServerOptions {
  /** When set, only tools/skills/plugins allowed for this role (and inherited roles) are registered. */
  role?: string;
}

const toolResultCast = (r: Awaited<ReturnType<typeof executeTool>>) =>
  r as Awaited<ReturnType<Parameters<McpServer["registerTool"]>[2]>>;

async function runDynamicSkillSteps(
  steps: DynamicSkillStep[],
  args: Record<string, unknown>
): Promise<Awaited<ReturnType<typeof executeTool>>> {
  const results: string[] = [];
  for (const step of steps) {
    const stepArgs = step.argsMap
      ? Object.fromEntries(
          Object.entries(step.argsMap).map(([k, v]) => [k, args[v] ?? v])
        )
      : args;
    if (step.type === "tool") {
      const out = await executeTool(step.target, stepArgs);
      results.push(
        out.content.map((c) => ("text" in c ? c.text : "")).join("")
      );
    } else {
      const match = step.target.startsWith(PLUGIN_TOOL_PREFIX)
        ? step.target.slice(PLUGIN_TOOL_PREFIX.length).split(":")
        : [];
      if (match.length >= 2) {
        const [pluginId, ...rest] = match;
        const originalName = rest.join(":");
        const out = await callPluginTool(
          pluginId,
          originalName,
          stepArgs as Record<string, unknown>
        );
        results.push(
          out.content.map((c) => c.text ?? "").join("")
        );
      }
    }
  }
  return {
    content: [{ type: "text" as const, text: results.join("\n\n") }],
    isError: false,
  };
}

/**
 * Creates and configures the MCP server: initialize, unified tools/list (local + skills + plugins + dynamic), tools/call routed by name.
 * If options.role is set, only entities allowed for that role (and inherited roles) are registered.
 */
export async function createServer(options?: CreateServerOptions): Promise<McpServer> {
  const role = options?.role;
  registerBuiltInTools();
  registerBuiltInSkills();

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    { capabilities: DEFAULT_CAPABILITIES }
  );

  // Built-in tools: no allowedRoles → visible to all
  for (const tool of getAllTools()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => toolResultCast(await executeTool(tool.name, args))
    );
  }

  // Built-in skills: visible to all
  for (const skill of getAllSkills()) {
    const toolName = skillToToolName(skill.name);
    server.registerTool(
      toolName,
      {
        description: `[Skill] ${skill.description}`,
        inputSchema: skill.inputSchema as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) =>
        toolResultCast(await executeSkill(skill.name, args))
    );
  }

  const dynamic = await loadDynamicRegistry();

  for (const entry of dynamic.tools) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const handlerRef = entry.handlerRef;
    server.registerTool(
      entry.name,
      {
        description: entry.description,
        inputSchema: (entry.inputSchema ?? {}) as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) =>
        toolResultCast(await executeTool(handlerRef, args))
    );
  }
  for (const entry of dynamic.skills) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const steps = entry.steps ?? [];
    const toolName = skillToToolName(entry.name);
    server.registerTool(
      toolName,
      {
        description: `[Skill] ${entry.description}`,
        inputSchema: (entry.inputSchema ?? {}) as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const result = await runDynamicSkillSteps(
          steps,
          (args as Record<string, unknown>) ?? {}
        );
        return toolResultCast(result);
      }
    );
  }

  const pluginAllowedMap = new Map<string, string[]>();
  for (const p of dynamic.plugins) {
    if (p.allowedRoles && p.allowedRoles.length > 0) {
      pluginAllowedMap.set(p.id, p.allowedRoles);
    }
  }

  for (const plugin of getLoadedPlugins()) {
    if (role) {
      const allowed = pluginAllowedMap.get(plugin.id);
      if (allowed !== undefined && !(await isAllowedForRole(allowed, role))) continue;
    }
    for (const pt of plugin.tools) {
      const pluginId = plugin.id;
      const originalName = pt.originalName;
      server.registerTool(
        pt.name,
        {
          description: pt.description ?? `[Plugin ${plugin.name}] ${pt.originalName}`,
          inputSchema: (pt.inputSchema ?? {}) as Record<string, unknown>,
        } as Parameters<McpServer["registerTool"]>[1],
        async (args: unknown) => {
          const result = await callPluginTool(pluginId, originalName, args as Record<string, unknown>);
          return toolResultCast({
            content: result.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
            isError: result.isError,
          });
        }
      );
    }
  }

  return server;
}

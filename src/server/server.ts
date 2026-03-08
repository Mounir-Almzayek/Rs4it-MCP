/**
 * MCP Server layer (Phase 01 + 02 + 03 + 05).
 * Builds the McpServer with serverInfo, capabilities, and merged tools (local + skills + plugins).
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

const toolResultCast = (r: Awaited<ReturnType<typeof executeTool>>) =>
  r as Awaited<ReturnType<Parameters<McpServer["registerTool"]>[2]>>;

/**
 * Creates and configures the MCP server: initialize, unified tools/list (local + skills + plugins), tools/call routed by name.
 */
export function createServer(): McpServer {
  registerBuiltInTools();
  registerBuiltInSkills();

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    { capabilities: DEFAULT_CAPABILITIES }
  );

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

  for (const plugin of getLoadedPlugins()) {
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

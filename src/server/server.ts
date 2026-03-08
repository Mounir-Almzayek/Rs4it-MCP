/**
 * MCP Server layer (Phase 01 + 02 + 03).
 * Builds the McpServer with serverInfo, capabilities, tools, and skills (as tools with skill: prefix).
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

/**
 * Creates and configures the MCP server: initialize, tools/list (tools + skills), tools/call via executeTool or executeSkill.
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

  const toolResultCast = (r: Awaited<ReturnType<typeof executeTool>>) =>
    r as Awaited<ReturnType<Parameters<McpServer["registerTool"]>[2]>>;

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

  return server;
}

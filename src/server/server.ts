/**
 * MCP Server layer (Phase 01 + 02).
 * Builds the McpServer with serverInfo, capabilities, and tools from the registry.
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

/**
 * Creates and configures the MCP server: initialize, tools/list from registry, tools/call via executeTool.
 */
export function createServer(): McpServer {
  registerBuiltInTools();

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
      async (args: unknown) =>
        (await executeTool(tool.name, args)) as Awaited<
          ReturnType<Parameters<McpServer["registerTool"]>[2]>
        >
    );
  }

  return server;
}

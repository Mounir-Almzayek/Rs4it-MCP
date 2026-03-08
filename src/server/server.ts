/**
 * MCP Server layer (Phase 01).
 * Builds and configures the McpServer with serverInfo, capabilities,
 * and a minimal tool registry (one demo tool for verification).
 * No real tool execution yet — that is Phase 02.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  SERVER_NAME,
  SERVER_VERSION,
  DEFAULT_CAPABILITIES,
} from "../config/constants.js";

/**
 * Creates and configures the MCP server: initialize response (serverInfo, capabilities),
 * tools/list (via registered tools), and tools/call handler (prepared; real execution in Phase 02).
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    { capabilities: DEFAULT_CAPABILITIES }
  );

  // Demo tool for Phase 01 verification. Real tools are added in Phase 02.
  server.registerTool(
    "ping",
    {
      description: "Echo/ping for connectivity check. No side effects.",
      inputSchema: {
        message: z.string().optional().describe("Optional message to echo back"),
      },
    },
    async ({ message }) => ({
      content: [
        {
          type: "text" as const,
          text: message ? `pong: ${message}` : "pong",
        },
      ],
    })
  );

  return server;
}

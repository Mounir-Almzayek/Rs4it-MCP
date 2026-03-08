/**
 * RS4IT MCP Hub — Entry point (Phase 01).
 * Starts the MCP server over stdio and handles lifecycle (clean shutdown).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  const handleClose = async (): Promise<void> => {
    try {
      await server.close();
    } catch (err) {
      console.error("[rs4it-mcp] Error during shutdown:", err);
    }
    process.exit(0);
  };

  transport.onclose = handleClose;

  process.on("SIGINT", handleClose);
  process.on("SIGTERM", handleClose);

  await server.connect(transport);
}

main().catch((err) => {
  console.error("[rs4it-mcp] Fatal error:", err);
  process.exit(1);
});

/**
 * RS4IT MCP Hub — HTTP/SSE entry point (Phase 07).
 * Starts the Hub as a network service using Streamable HTTP, with session store and clean shutdown.
 */

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import { loadAllPlugins, closeAllPlugins } from "../plugins/index.js";
import { getPort, getBaseUrl } from "../config/transport.js";

type SessionId = string;
interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createServer>;
}

const sessions = new Map<SessionId, SessionState>();

function createSession(): SessionState {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { transport, server });
    },
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) sessions.delete(sid);
  };

  return { transport, server };
}

async function handlePost(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && req.body && isInitializeRequest(req.body)) {
      const { transport, server } = createSession();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: missing or invalid session. Send initialize first without mcp-session-id.",
        },
        id: null,
      })
    );
  } catch (err) {
    console.error("[rs4it-mcp] HTTP POST error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        })
      );
    }
  }
}

async function handleGet(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.statusCode = 400;
    res.end("Invalid or missing mcp-session-id");
    return;
  }
  const { transport } = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
}

async function handleDelete(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.statusCode = 400;
    res.end("Invalid or missing mcp-session-id");
    return;
  }
  try {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("[rs4it-mcp] Session delete error:", err);
    if (!res.headersSent) res.statusCode = 500;
    if (!res.writableEnded) res.end();
  }
}

async function main(): Promise<void> {
  await loadAllPlugins();

  const port = getPort();
  const baseUrl = getBaseUrl();
  const app = createMcpExpressApp();

  app.post("/mcp", (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    void handlePost(req, res);
  });
  app.get("/mcp", (req: IncomingMessage, res: ServerResponse) => {
    void handleGet(req, res);
  });
  app.delete("/mcp", (req: IncomingMessage, res: ServerResponse) => {
    void handleDelete(req, res);
  });

  const server = app.listen(port, () => {
    console.log(`[rs4it-mcp] Streamable HTTP server listening on port ${port}`);
    console.log(`[rs4it-mcp] MCP endpoint: ${baseUrl}/mcp`);
  });

  const shutdown = async (): Promise<void> => {
    console.log("[rs4it-mcp] Shutting down HTTP server...");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [sid, { transport, server: mcpServer }] of sessions) {
      try {
        await transport.close();
        await mcpServer.close();
      } catch (e) {
        console.error(`[rs4it-mcp] Error closing session ${sid}:`, e);
      }
      sessions.delete(sid);
    }
    await closeAllPlugins();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error("[rs4it-mcp] Fatal error:", err);
  process.exit(1);
});

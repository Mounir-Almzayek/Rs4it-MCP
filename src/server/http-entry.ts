/**
 * RS4IT MCP Hub — HTTP/SSE entry point (Phase 07).
 * Starts the Hub as a network service using Streamable HTTP, with session store and clean shutdown.
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import { loadAllPlugins, closeAllPlugins } from "../plugins/index.js";
import { getPort, getBaseUrl } from "../config/transport.js";
import { upsertMcpUser } from "../config/mcp-users-store.js";
import { recordInvocation } from "../config/usage-store.js";
import { buildToolCatalog } from "../skill-compiler/tool-catalog.js";
import { compileSkill, CompileError } from "../skill-compiler/compiler.js";
import { evaluateDraftAgainstPolicies } from "../skill-compiler/policies.js";
import { dryRunRequestSchema } from "../skill-compiler/types.js";
import { executeDraft } from "../skill-compiler/executor.js";
import { appendSkillExecution } from "../config/skill-execution-store.js";

type SessionId = string;
interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  userName?: string;
}

const sessions = new Map<SessionId, SessionState>();

function requireAdminSecret(req: IncomingMessage): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env["MCP_ADMIN_API_SECRET"];
  if (!secret) return { ok: true };
  const header = req.headers["x-admin-secret"];
  if (typeof header !== "string" || header !== secret) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}

function getRoleFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
  const h = req.headers["x-mcp-role"];
  if (typeof h === "string" && h.trim()) return h.trim();
  const body = req.body;
  if (body && typeof body === "object" && "params" in body) {
    const params = (body as { params?: unknown }).params;
    if (params && typeof params === "object" && "role" in params) {
      const r = (params as { role?: unknown }).role;
      if (typeof r === "string" && r.trim()) return r.trim();
    }
  }
  return undefined;
}

function getUserNameFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
  const h = req.headers["x-mcp-user-name"];
  if (typeof h === "string" && h.trim()) return h.trim();
  const body = req.body;
  if (body && typeof body === "object" && "params" in body) {
    const params = (body as { params?: unknown }).params;
    if (params && typeof params === "object" && "userName" in params) {
      const n = (params as { userName?: unknown }).userName;
      if (typeof n === "string" && n.trim()) return n.trim();
    }
  }
  return undefined;
}

/** Fire-and-forget: update last_used_at for the given user so MCP requests are not delayed. */
function trackMcpUserUsage(userName: string | undefined): void {
  if (!userName) return;
  void upsertMcpUser(userName);
}

async function createSession(role?: string, userName?: string): Promise<SessionState> {
  const state: SessionState = {
    transport: undefined!,
    server: undefined!,
    userName,
  };
  const baseUrl = getBaseUrl();
  state.server = await createServer({
    role: role ? role : undefined,
    onToolInvoked: (toolName) => recordInvocation(toolName, state.userName),
    baseUrl,
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      state.transport = transport;
      sessions.set(sessionId, state);
    },
  });
  state.transport = transport;

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) sessions.delete(sid);
  };

  return state;
}

async function handlePost(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const state = sessions.get(sessionId)!;
      await state.transport.handleRequest(req, res, req.body);
      trackMcpUserUsage(state.userName);
      return;
    }

    if (!sessionId && req.body && isInitializeRequest(req.body)) {
      const role = getRoleFromRequest(req);
      const userName = getUserNameFromRequest(req);
      let state: SessionState;
      try {
        state = await createSession(role, userName);
      } catch (sessionErr) {
        const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        const stack = sessionErr instanceof Error ? sessionErr.stack : undefined;
        console.error("[rs4it-mcp] Session creation failed:", msg);
        if (stack) console.error(stack);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          const detail = process.env["MCP_DEBUG"] ? msg : "Internal server error";
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: detail },
              id: null,
            })
          );
        }
        return;
      }
      try {
        await state.server.connect(state.transport);
        await state.transport.handleRequest(req, res, req.body);
        trackMcpUserUsage(state.userName);
        return;
      } catch (connectErr) {
        const msg = connectErr instanceof Error ? connectErr.message : String(connectErr);
        const stack = connectErr instanceof Error ? connectErr.stack : undefined;
        console.error("[rs4it-mcp] Connect/handleRequest failed:", msg);
        if (stack) console.error(stack);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          const detail = process.env["MCP_DEBUG"] ? msg : "Internal server error";
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: detail },
              id: null,
            })
          );
        }
        return;
      }
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
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[rs4it-mcp] HTTP POST error:", msg);
    if (stack) console.error(stack);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      const detail = process.env["MCP_DEBUG"] ? msg : "Internal server error";
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: detail },
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
  const state = sessions.get(sessionId)!;
  await state.transport.handleRequest(req, res);
  trackMcpUserUsage(state.userName);
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

const DEFAULT_LOCALHOST_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function getAllowedHosts(): string[] | undefined {
  const env = process.env["MCP_ALLOWED_HOSTS"];
  if (!env || typeof env !== "string") return undefined;
  const fromEnv = env.split(",").map((h) => h.trim()).filter(Boolean);
  const combined = [...new Set([...fromEnv, ...DEFAULT_LOCALHOST_HOSTS])];
  return combined.length > 0 ? combined : undefined;
}

async function main(): Promise<void> {
  await loadAllPlugins();

  const port = getPort();
  const baseUrl = getBaseUrl();
  const allowedHosts = getAllowedHosts();
  const app = createMcpExpressApp(
    allowedHosts && allowedHosts.length > 0
      ? { host: "0.0.0.0", allowedHosts }
      : undefined
  );

  const logoPath = process.env.MCP_LOGO_PATH
    ? path.resolve(process.env.MCP_LOGO_PATH)
    : path.join(process.cwd(), "assets", "rs4it-logo.webp");
  app.get("/logo", async (_req: IncomingMessage, res: ServerResponse) => {
    try {
      const data = await readFile(logoPath);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.end("Not found");
    }
  });

  app.post("/mcp", (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    void handlePost(req, res);
  });
  app.get("/mcp", (req: IncomingMessage, res: ServerResponse) => {
    void handleGet(req, res);
  });
  app.delete("/mcp", (req: IncomingMessage, res: ServerResponse) => {
    void handleDelete(req, res);
  });

  app.post("/reload", async (_req: IncomingMessage, res: ServerResponse) => {
    const secret = process.env["MCP_RELOAD_SECRET"];
    if (secret) {
      const header = _req.headers["x-reload-secret"];
      if (header !== secret) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Forbidden" }));
        return;
      }
    }
    try {
      await closeAllPlugins();
      await loadAllPlugins();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, message: "Plugins reloaded" }));
    } catch (err) {
      console.error("[rs4it-mcp] Reload failed:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
  });

  // Skill Compiler API (for Admin panel UX). Protected by MCP_ADMIN_API_SECRET if set.
  app.post("/api/skill-compiler/compile", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const role =
        (req.body && typeof req.body === "object" && "role" in (req.body as Record<string, unknown>))
          ? String((req.body as Record<string, unknown>)["role"] ?? "")
          : undefined;
      const toolCatalog = await buildToolCatalog(role);
      const compiled = await compileSkill({ req: req.body, toolCatalog });
      const catalogForPolicy = [
        ...toolCatalog,
        ...(compiled.suggestedTools ?? []).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          source: "dynamic" as const,
        })),
      ];
      const policy = evaluateDraftAgainstPolicies({
        draft: compiled.draft,
        toolCatalog: catalogForPolicy,
        role: role || undefined,
      });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ...compiled, policy }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rawOpenRouterOutput = e instanceof CompileError ? e.rawOpenRouterOutput : undefined;
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify(
          rawOpenRouterOutput !== undefined ? { ok: false, error: msg, rawOpenRouterOutput } : { ok: false, error: msg },
        ),
      );
    }
  });

  app.post("/api/skill-compiler/dry-run", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const parsed = dryRunRequestSchema.parse(req.body);
      const toolCatalog = await buildToolCatalog(parsed.role);
      const decision = evaluateDraftAgainstPolicies({ draft: parsed.draft, toolCatalog, role: parsed.role });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: decision.blocked.length === 0, blocked: decision.blocked, warnings: decision.warnings }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.post("/api/skill-compiler/execute", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = req.body as Record<string, unknown>;
      const parsed = dryRunRequestSchema.parse({ draft: body?.draft, role: body?.role });
      const toolCatalog = await buildToolCatalog(parsed.role);
      const decision = evaluateDraftAgainstPolicies({ draft: parsed.draft, toolCatalog, role: parsed.role });
      if (decision.blocked.length > 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, blocked: decision.blocked, warnings: decision.warnings }));
        return;
      }
      const input = (body?.input && typeof body.input === "object" && !Array.isArray(body.input))
        ? (body.input as Record<string, unknown>)
        : {};
      const { result, trace } = await executeDraft({ draft: parsed.draft, input });
      const id = randomUUID();
      await appendSkillExecution({
        id,
        skillName: parsed.draft.name,
        createdAt: new Date().toISOString(),
        trace,
      });
      res.statusCode = result.isError ? 500 : 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: !result.isError, result, traceId: id, trace }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
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

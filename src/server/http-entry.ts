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
import {
  getSystem2030SessionByEmail,
  upsertSystem2030Session,
  listSystem2030Sessions,
  deleteSystem2030SessionByEmail,
} from "../integrations/system2030/store.js";
import { system2030Login, system2030Me } from "../integrations/system2030/client.js";
import { loadRoleConfig, writeRoleConfig } from "../config/roles.js";
import { loadDynamicRegistry, writeDynamicRegistry } from "../config/dynamic-config.js";
import { loadPluginsConfig } from "../config/load-plugins-config.js";
import { readPluginStatus } from "../config/plugin-status-store.js";
import { listMcpUsers } from "../config/mcp-users-store.js";
import { getUsageStats } from "../config/usage-store.js";
import { prisma } from "../db/prisma.js";
import { compare, hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";

type SessionId = string;
interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  userName?: string;
  system2030Email?: string;
  system2030LastMeAtMs?: number;
}

const sessions = new Map<SessionId, SessionState>();

/** When true, JSON-RPC -32603 responses include a short error message (for debugging). */
function exposeErrorsToClient(): boolean {
  const d = process.env["MCP_DEBUG"];
  const e = process.env["MCP_EXPOSE_CLIENT_ERRORS"];
  return d === "1" || d === "true" || e === "1" || e === "true";
}

function clientErrorDetail(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const max = 500;
  return msg.length > max ? `${msg.slice(0, max)}…` : msg;
}

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

function getEmailFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
  const h = req.headers["x-mcp-email"];
  if (typeof h === "string" && h.trim()) return h.trim();
  const h2 = req.headers["x-mcp-user-email"];
  if (typeof h2 === "string" && h2.trim()) return h2.trim();
  const body = req.body;
  if (body && typeof body === "object" && "params" in body) {
    const params = (body as { params?: unknown }).params;
    if (params && typeof params === "object" && "email" in params) {
      const e = (params as { email?: unknown }).email;
      if (typeof e === "string" && e.trim()) return e.trim();
    }
  }
  return undefined;
}

function getPasswordFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
  const h = req.headers["x-mcp-password"];
  if (typeof h === "string" && h.trim()) return h.trim();
  const h2 = req.headers["x-mcp-user-password"];
  if (typeof h2 === "string" && h2.trim()) return h2.trim();
  const body = req.body;
  if (body && typeof body === "object" && "params" in body) {
    const params = (body as { params?: unknown }).params;
    if (params && typeof params === "object" && "password" in params) {
      const p = (params as { password?: unknown }).password;
      if (typeof p === "string" && p.trim()) return p.trim();
    }
  }
  return undefined;
}

function meRefreshIntervalMs(): number {
  const raw = process.env["SYSTEM2030_ME_REFRESH_SEC"];
  const sec = raw ? Number(raw) : 300;
  if (!Number.isFinite(sec) || sec <= 0) return 300_000;
  return Math.max(30, sec) * 1000;
}

async function ensureSystem2030Active(
  req: IncomingMessage & { body?: unknown },
  state: SessionState,
  options?: { force?: boolean }
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const email = state.system2030Email ?? getEmailFromRequest(req);
  if (!email) {
    return { ok: false, status: 401, message: "Unauthorized: missing email header (X-MCP-Email)." };
  }

  const nowMs = Date.now();
  const shouldRefresh =
    options?.force === true ||
    !state.system2030LastMeAtMs ||
    nowMs - state.system2030LastMeAtMs > meRefreshIntervalMs();
  if (!shouldRefresh) return { ok: true };

  const stored = await getSystem2030SessionByEmail(email);
  let token = stored?.token;
  if (!token) {
    const password = getPasswordFromRequest(req);
    if (!password) {
      return { ok: false, status: 401, message: "Unauthorized: no stored session; provide password (X-MCP-Password) to login." };
    }
    try {
      const login = await system2030Login({ email, password });
      token = login.token;
      await upsertSystem2030Session({
        email,
        token,
        notificationToken: login.notificationToken,
        userId: login.user?.id,
        lastLoginAt: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 401, message: `Unauthorized: login failed. ${msg}` };
    }
  }

  let programmer;
  try {
    programmer = await system2030Me({ token });
  } catch (e) {
    // token may be expired → try re-login once if password provided
    const password = getPasswordFromRequest(req);
    if (!password) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 401, message: `Unauthorized: token invalid and no password provided. ${msg}` };
    }
    try {
      const login = await system2030Login({ email, password });
      token = login.token;
      await upsertSystem2030Session({
        email,
        token,
        notificationToken: login.notificationToken,
        userId: login.user?.id,
        lastLoginAt: new Date().toISOString(),
      });
      programmer = await system2030Me({ token });
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      return { ok: false, status: 401, message: `Unauthorized: login failed. ${msg}` };
    }
  }

  const status = String((programmer as any)?.status ?? "").toLowerCase();
  const isActive = status === "active";
  const isoNow = new Date().toISOString();
  await upsertSystem2030Session({
    email,
    token,
    programmer,
    lastMeAt: isoNow,
  });
  state.system2030Email = email;
  state.system2030LastMeAtMs = nowMs;
  state.userName = (programmer as any)?.email || (programmer as any)?.name || email;

  if (!isActive) {
    return {
      ok: false,
      status: 403,
      message: "Access denied: you are not an active company programmer, so you are not allowed to use this MCP.",
    };
  }
  return { ok: true };
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
    // Cursor/clients may omit a strict Accept header on the initial POST.
    // The StreamableHTTP transport expects the client to accept BOTH JSON and event-stream.
    // Make the server tolerant by defaulting Accept when missing/incomplete.
    const accept = req.headers["accept"];
    const acceptStr = Array.isArray(accept) ? accept.join(",") : (accept ?? "").toString();
    // The MCP SDK requires both tokens explicitly (Accept: */* is not sufficient).
    const hasJson = acceptStr.includes("application/json");
    const hasSse = acceptStr.includes("text/event-stream");
    if (!hasJson || !hasSse) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req.headers as any)["accept"] = "application/json, text/event-stream";
    }

    if (sessionId && sessions.has(sessionId)) {
      const state = sessions.get(sessionId)!;
      if (state.system2030Email) {
        const gate = await ensureSystem2030Active(req, state);
        if (!gate.ok) {
          res.statusCode = gate.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: gate.message }, id: null }));
          return;
        }
      }
      await state.transport.handleRequest(req, res, req.body);
      trackMcpUserUsage(state.userName);
      return;
    }

    if (!sessionId && req.body && isInitializeRequest(req.body)) {
      const role = getRoleFromRequest(req);
      // New auth model: email/password via headers. username is still supported for anonymous/internal usage.
      const email = getEmailFromRequest(req);
      const userName = email ? email : getUserNameFromRequest(req);
      let state: SessionState;
      try {
        state = await createSession(role, userName);
        if (email) {
          state.system2030Email = email;
          const gate = await ensureSystem2030Active(req, state, { force: true });
          if (!gate.ok) {
            if (!res.headersSent) {
              res.statusCode = gate.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: gate.message }, id: null }));
            }
            return;
          }
        }
      } catch (sessionErr) {
        const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        const stack = sessionErr instanceof Error ? sessionErr.stack : undefined;
        console.error("[rs4it-mcp] Session creation failed:", msg);
        if (stack) console.error(stack);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          const detail = exposeErrorsToClient() ? clientErrorDetail(sessionErr) : "Internal server error";
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
          const detail = exposeErrorsToClient() ? clientErrorDetail(connectErr) : "Internal server error";
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
      const detail = exposeErrorsToClient() ? clientErrorDetail(err) : "Internal server error";
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

  // System2030 Sessions API (for Admin panel).
  // Protected by MCP_ADMIN_API_SECRET if set.
  app.get("/api/system2030-sessions", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const sessions = await listSystem2030Sessions();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, sessions }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.delete("/api/system2030-sessions", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      const email = url.searchParams.get("email") ?? "";
      const deleted = await deleteSystem2030SessionByEmail(email);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, deleted }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  // Roles API (for Admin panel).
  // Protected by MCP_ADMIN_API_SECRET if set.
  app.get("/api/roles", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const config = await loadRoleConfig();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, config }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.put("/api/roles", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as Record<string, unknown>) : {};
      const config = {
        defaultRole: body["defaultRole"] !== undefined ? String(body["defaultRole"] ?? "") : undefined,
        roles: Array.isArray(body["roles"]) ? (body["roles"] as any[]) : [],
      };
      await writeRoleConfig(config as any);
      const updated = await loadRoleConfig();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, config: updated }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  // Registry API (dynamic tools/skills/prompts/resources/rules + plugin configs mirror).
  app.get("/api/registry", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const registry = await loadDynamicRegistry();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, registry }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.put("/api/registry", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as Record<string, unknown>) : {};
      const registry = (body["registry"] ?? body) as any;
      await writeDynamicRegistry(registry);
      const updated = await loadDynamicRegistry();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, registry: updated }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  // Plugins config API (external plugins; enabled only is used by runtime loader).
  app.get("/api/plugins-config", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const all = await prisma.pluginConfig.findMany({ orderBy: { id: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, plugins: all }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.put("/api/plugins-config", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as Record<string, unknown>) : {};
      const plugins = Array.isArray(body["plugins"]) ? (body["plugins"] as any[]) : [];
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.pluginConfig.deleteMany({});
        for (const p of plugins) {
          if (!p?.id || !p?.command || !p?.name) continue;
          await tx.pluginConfig.create({
            data: {
              id: String(p.id),
              name: String(p.name),
              command: String(p.command),
              args: (Array.isArray(p.args) ? p.args : []) as any,
              description: p.description ? String(p.description) : null,
              cwd: p.cwd ? String(p.cwd) : null,
              env: (p.env ?? null) as any,
              timeout: typeof p.timeout === "number" ? p.timeout : null,
              enabled: p.enabled !== false,
              allowedRoles: (p.allowedRoles ?? null) as any,
              source: (p.source ?? "admin") as any,
              origin: p.origin ? String(p.origin) : null,
            },
          });
        }
      });
      const updated = await prisma.pluginConfig.findMany({ orderBy: { id: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, plugins: updated }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.get("/api/plugin-status", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const snap = await readPluginStatus();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, snapshot: snap }));
  });

  app.get("/api/mcp-users", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const users = await listMcpUsers();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, users }));
  });

  app.get("/api/usage", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const url = new URL(req.url ?? "", "http://localhost");
    const since = url.searchParams.get("since") ?? undefined;
    const recentLimit = url.searchParams.get("recentLimit");
    const stats = await getUsageStats({
      since,
      recentLimit: recentLimit ? Number(recentLimit) : undefined,
    });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, stats }));
  });

  // Settings export/import (DB snapshot).
  app.post("/api/settings/export", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const roles = await loadRoleConfig();
    const registry = await loadDynamicRegistry();
    const plugins = await prisma.pluginConfig.findMany({ orderBy: { id: "asc" } });
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      items: {
        roles,
        dynamicRegistry: registry,
        plugins,
      },
    };
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  });

  app.post("/api/settings/import", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as any) : {};
      const items = body.items ?? {};
      if (items.roles) await writeRoleConfig(items.roles);
      if (items.dynamicRegistry) await writeDynamicRegistry(items.dynamicRegistry);
      if (Array.isArray(items.plugins)) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.pluginConfig.deleteMany({});
          for (const p of items.plugins) {
            if (!p?.id || !p?.command || !p?.name) continue;
            await tx.pluginConfig.create({
              data: {
                id: String(p.id),
                name: String(p.name),
                command: String(p.command),
                args: (p.args ?? []) as any,
                description: p.description ?? null,
                cwd: p.cwd ?? null,
                env: (p.env ?? null) as any,
                timeout: p.timeout ?? null,
                enabled: p.enabled !== false,
                allowedRoles: (p.allowedRoles ?? null) as any,
                source: p.source ?? "admin",
                origin: p.origin ?? null,
              },
            });
          }
        });
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  // Admin credentials API (DB-backed, single user).
  app.get("/api/admin/credentials/status", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const exists = (await prisma.adminUser.count()) > 0;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, exists }));
  });

  app.post("/api/admin/setup", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const body = (req.body && typeof req.body === "object") ? (req.body as any) : {};
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || password.length < 6) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Invalid username/password" }));
      return;
    }
    const existing = await prisma.adminUser.findFirst();
    if (existing) {
      res.statusCode = 409;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Credentials already configured" }));
      return;
    }
    const passwordHash = await hash(password, 8);
    await prisma.adminUser.create({ data: { username, passwordHash } });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });

  app.post("/api/admin/login", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const body = (req.body && typeof req.body === "object") ? (req.body as any) : {};
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const user = await prisma.adminUser.findFirst();
    if (!user || user.username !== username) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });

  app.put("/api/admin/credentials", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as any) : {};
      const currentPassword = String(body.currentPassword ?? "");
      const newUsername = body.newUsername !== undefined ? String(body.newUsername ?? "").trim() : undefined;
      const newPassword = body.newPassword !== undefined ? String(body.newPassword ?? "") : undefined;
      const user = await prisma.adminUser.findFirst();
      if (!user) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "No credentials configured" }));
        return;
      }
      const valid = await compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Current password is incorrect" }));
        return;
      }
      const username = newUsername !== undefined ? newUsername : user.username;
      if (!username) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Username cannot be empty" }));
        return;
      }
      if (newPassword !== undefined && newPassword.length < 6) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "New password must be at least 6 characters" }));
        return;
      }
      const passwordHash = await hash(newPassword ?? currentPassword, 8);
      await prisma.adminUser.update({ where: { id: user.id }, data: { username, passwordHash } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
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

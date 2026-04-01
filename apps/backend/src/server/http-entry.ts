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
import {
  getSystem2030SessionByEmail,
  upsertSystem2030Session,
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
import { registerSystem2030SessionsRoutes } from "./routes/system2030-sessions.js";
import { registerRoleRoutes } from "./routes/roles.js";
import { migrateLegacyJsonConfigIfNeeded } from "../bootstrap/legacy-json-migration.js";
import { validateAllowedRoles } from "../config/roles.js";
import { renderAuthPage } from "../web/auth/page.js";

type SessionId = string;
interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  userName?: string;
  system2030Email?: string;
  system2030LastMeAtMs?: number;
  skipSystem2030Check?: boolean;
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

type RateLimitBucket = { count: number; resetAtMs: number };

function getClientIp(req: IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0]?.trim() || "unknown";
  const xrip = req.headers["x-real-ip"];
  if (typeof xrip === "string" && xrip.trim()) return xrip.trim();
  return "unknown";
}

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const now = Date.now();
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  
  if (!existing || Number(existing.resetAtMs) <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAtMs: BigInt(now + windowMs) },
      update: { count: 1, resetAtMs: BigInt(now + windowMs) },
    });
    return { ok: true };
  }
  
  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((Number(existing.resetAtMs) - now) / 1000)) };
  }
  
  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return { ok: true };
}

function requireAdminSecret(req: IncomingMessage): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env["MCP_ADMIN_API_SECRET"];
  const requireSecret =
    process.env["MCP_REQUIRE_ADMIN_API_SECRET"] === "1" ||
    process.env["MCP_REQUIRE_ADMIN_API_SECRET"] === "true" ||
    process.env["NODE_ENV"] === "production";
  if (!secret) {
    return requireSecret
      ? { ok: false, status: 503, error: "Server misconfigured: MCP_ADMIN_API_SECRET is required" }
      : { ok: true };
  }
  const header = req.headers["x-admin-secret"];
  if (typeof header !== "string" || header !== secret) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}

function getRoleFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
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

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers["cookie"];
  const raw = Array.isArray(header) ? header.join(";") : (header ?? "");
  const out: Record<string, string> = {};
  for (const part of String(raw).split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function getRoleFromCookies(req: IncomingMessage): string | undefined {
  const c = parseCookies(req);
  const v = c["mcp_role"];
  return v && v.trim() ? v.trim() : undefined;
}

function getEmailFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
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

function getEmailFromCookies(req: IncomingMessage): string | undefined {
  const c = parseCookies(req);
  const v = c["mcp_email"];
  return v && v.trim() ? v.trim() : undefined;
}

function getPasswordFromRequest(req: IncomingMessage & { body?: unknown }): string | undefined {
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

function getBearerToken(req: IncomingMessage): string | undefined {
  const auth = req.headers["authorization"];
  const v = Array.isArray(auth) ? auth[0] : auth;
  if (!v) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(v.trim());
  return m?.[1]?.trim();
}

async function getIdentityFromBearer(req: IncomingMessage): Promise<{ email: string; role?: string } | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const data = await prisma.oauthToken.findUnique({ where: { token } });
  if (!data) return null;
  return { email: data.email, role: data.role ?? undefined };
}

function isHtmlRequest(req: IncomingMessage): boolean {
  const accept = req.headers["accept"];
  const a = Array.isArray(accept) ? accept.join(",") : String(accept ?? "");
  return a.includes("text/html");
}

function setCookieHeaders(options: { email: string; role?: string; secure: boolean; authOnce: string }): string[] {
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
  const sec = options.secure ? "; Secure" : "";
  const cookies: string[] = [];
  cookies.push(`mcp_email=${encodeURIComponent(options.email)}; ${base}${sec}`);
  if (options.role && options.role.trim()) {
    cookies.push(`mcp_role=${encodeURIComponent(options.role.trim())}; ${base}${sec}`);
  }
  cookies.push(`mcp_auth_once=${encodeURIComponent(options.authOnce)}; ${base}${sec}`);
  return cookies;
}

function clearCookieHeaders(options: { secure: boolean }): string[] {
  const base = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  const sec = options.secure ? "; Secure" : "";
  return [`mcp_email=; ${base}${sec}`, `mcp_role=; ${base}${sec}`, `mcp_auth_once=; ${base}${sec}`];
}

function getAuthOnceFromCookies(req: IncomingMessage): string | undefined {
  const c = parseCookies(req);
  const v = c["mcp_auth_once"];
  return v && v.trim() ? v.trim() : undefined;
}

function clearAuthOnceCookie(options: { secure: boolean }): string {
  const base = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  const sec = options.secure ? "; Secure" : "";
  return `mcp_auth_once=; ${base}${sec}`;
}

async function ensureSystem2030Active(
  req: IncomingMessage & { body?: unknown },
  state: SessionState
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const email = state.system2030Email ?? getEmailFromRequest(req) ?? getEmailFromCookies(req);
  if (!email) {
    return { ok: false, status: 401, message: "Unauthorized: missing email (X-MCP-Email header or mcp_email cookie)." };
  }

  const nowMs = Date.now();

  const stored = await getSystem2030SessionByEmail(email);
  let token = stored?.token;
  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized: no stored System2030 session. Login again from /auth." };
  }

  let programmer;
  try {
    programmer = await system2030Me({ token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 401, message: `Unauthorized: invalid System2030 token. Login again from /auth. ${msg}` };
  }

  const isRootActive = (programmer as any)?.active === true;
  const programmerStatus = String((programmer as any)?.programmers?.[0]?.status ?? (programmer as any)?.status ?? "").toLowerCase();
  const isActive = isRootActive || programmerStatus === "active";
  const isoNow = new Date().toISOString();
  await upsertSystem2030Session({
    email,
    token,
    programmer,
    lastMeAt: isoNow,
  });
  state.system2030Email = email;
  state.system2030LastMeAtMs = nowMs;
  const displayName = String((programmer as any)?.programmers?.[0]?.name ?? (programmer as any)?.name ?? "").trim();
  state.userName = displayName || email;

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
      if (state.system2030Email && !state.skipSystem2030Check) {
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
      const bearerIdentity = await getIdentityFromBearer(req);
      const role = getRoleFromRequest(req) ?? getRoleFromCookies(req) ?? bearerIdentity?.role;
      const email = getEmailFromRequest(req) ?? getEmailFromCookies(req) ?? bearerIdentity?.email;
      const authOnce = getAuthOnceFromCookies(req);
      let state: SessionState;
      try {
        if (!email || (!authOnce && !bearerIdentity)) {
          if (!res.headersSent) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32001, message: "Unauthorized: authenticate first from /auth." },
                id: null,
              })
            );
          }
          return;
        }

        // Identity is cookie-based and bound to one authorization nonce per new MCP initialize.
        state = await createSession(role, email);
        state.system2030Email = email;
        if (bearerIdentity) {
          state.skipSystem2030Check = true;
        } else {
          const gate = await ensureSystem2030Active(req, state);
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
        const secure = process.env["NODE_ENV"] === "production";
        res.setHeader("Set-Cookie", clearAuthOnceCookie({ secure }));
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
    if (isHtmlRequest(req)) {
      res.statusCode = 302;
      res.setHeader("Location", "/auth");
      res.end();
      return;
    }
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
    if (isHtmlRequest(req)) {
      res.statusCode = 302;
      res.setHeader("Location", "/auth");
      res.end();
      return;
    }
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
  try {
    const result = await migrateLegacyJsonConfigIfNeeded();
    if (result.migrated) {
      console.log("[rs4it-mcp] Migrated legacy JSON config to DB.");
    }
  } catch (e) {
    console.error("[rs4it-mcp] Legacy JSON migration failed:", e);
  }

  await loadAllPlugins();

  const port = getPort();
  const baseUrl = getBaseUrl();
  const allowedHosts = getAllowedHosts();
  const app = createMcpExpressApp(
    allowedHosts && allowedHosts.length > 0
      ? { host: "0.0.0.0", allowedHosts }
      : undefined
  );

  // Centralized protection for admin APIs.
  // Route handlers still check `requireAdminSecret` (defense in depth), but this ensures new routes don't forget it.
  app.use("/api", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`hub_api:${ip}`, 240, 60_000);
    if (!rl.ok) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Retry-After", String(rl.retryAfterSeconds));
      res.end(JSON.stringify({ ok: false, error: "Too many requests" }));
      return;
    }
    next();
  });

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

  // Simple Hub auth page (cookie-based identity fallback for browser usage).
  app.get("/auth", async (req: IncomingMessage, res: ServerResponse) => {
    const email = getEmailFromCookies(req) ?? "";
    const role = getRoleFromCookies(req) ?? "";
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const cfg = await loadRoleConfig();
    const adminRoleId = process.env["MCP_ADMIN_ROLE_ID"] ? String(process.env["MCP_ADMIN_ROLE_ID"]) : "admin";
    res.end(renderAuthPage({ email, role, roles: cfg.roles ?? [], adminRoleId }));
  });

  app.post("/auth/login", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const body = req.body && typeof req.body === "object" ? (req.body as any) : {};
    const email = String(body.email ?? "").trim();
    const role = String(body.role ?? "").trim();
    const password = String(body.password ?? "");
    const adminPassword = String(body.adminPassword ?? "");
    if (!email) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Email is required");
      return;
    }
    try {
      const adminRoleId = process.env["MCP_ADMIN_ROLE_ID"] ? String(process.env["MCP_ADMIN_ROLE_ID"]) : "admin";
      if (role && role === adminRoleId) {
        const user = await prisma.adminUser.findFirst();
        if (!user) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain");
          res.end("Admin is not configured yet.");
          return;
        }
        const ok = await compare(adminPassword, user.passwordHash);
        if (!ok) {
          res.statusCode = 401;
          res.setHeader("Content-Type", "text/plain");
          res.end("Invalid admin dashboard password.");
          return;
        }
      }

      if (!password || !password.trim()) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end("System2030 password is required.");
        return;
      }
      const login = await system2030Login({ email, password });
      const me = await system2030Me({ token: login.token });
      const isRootActive = (me as any)?.active === true;
      const programmerStatus = String((me as any)?.programmers?.[0]?.status ?? (me as any)?.status ?? "").toLowerCase();
      const isActive = isRootActive || programmerStatus === "active";
      if (!isActive) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/plain");
        res.end("Access denied: account is not active.");
        return;
      }
      await upsertSystem2030Session({
        email,
        token: login.token,
        notificationToken: login.notificationToken,
        userId: login.user?.id,
        programmer: me,
        lastLoginAt: new Date().toISOString(),
        lastMeAt: new Date().toISOString(),
      });

      // Ensure the user appears in Admin "Users" list even before MCP traffic happens.
      await upsertMcpUser(me.name || email);

      const secure = process.env["NODE_ENV"] === "production";
      res.statusCode = 200;
      res.setHeader("Set-Cookie", setCookieHeaders({ email, role: role || undefined, secure, authOnce: randomUUID() }));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end(msg);
    }
  });

  app.post("/auth/logout", async (_req: IncomingMessage, res: ServerResponse) => {
    const secure = process.env["NODE_ENV"] === "production";
    res.statusCode = 200;
    res.setHeader("Set-Cookie", clearCookieHeaders({ secure }));
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });

  app.get("/.well-known/oauth-authorization-server", async (req: IncomingMessage, res: ServerResponse) => {
    const issuer = baseUrl;
    const data = {
      issuer,
      registration_endpoint: `${issuer}/register`,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["openid", "profile", "mcp"],
      code_challenge_methods_supported: ["S256", "plain"],
    };
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  });

  app.get("/.well-known/jwks.json", async (_req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [] }));
  });

  app.post("/register", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
    const redirectUris = Array.isArray(body["redirect_uris"]) ? (body["redirect_uris"] as unknown[]).map((x) => String(x)) : [];
    const clientId = `client_${randomUUID()}`;
    await prisma.oauthClient.create({ data: { clientId, redirectUris } });
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        client_id: clientId,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
        response_types: ["code"],
        redirect_uris: redirectUris,
      })
    );
  });

  app.get("/authorize", async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "", baseUrl);
    const clientId = String(url.searchParams.get("client_id") ?? "");
    const redirectUri = String(url.searchParams.get("redirect_uri") ?? "");
    const state = String(url.searchParams.get("state") ?? "");
    const client = await prisma.oauthClient.findUnique({ where: { clientId } });
    if (!clientId || !redirectUri || !client) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Invalid OAuth authorize request");
      return;
    }
    const identity = await getIdentityFromBearer(req);
    const email = identity?.email ?? getEmailFromCookies(req);
    if (!email) {
      const currentUrl = req.url ?? "";
      res.statusCode = 302;
      res.setHeader("Location", `/auth?continue=${encodeURIComponent(currentUrl)}`);
      res.end();
      return;
    }
    const role = identity?.role ?? getRoleFromCookies(req);
    const code = `code_${randomUUID()}`;
    await prisma.oauthCode.create({
      data: { code, clientId, redirectUri, email, role: role ?? null },
    });
    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);
    res.statusCode = 302;
    res.setHeader("Location", redirect.toString());
    res.end();
  });

  app.post("/token", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
    
    // Fallback parser for application/x-www-form-urlencoded if express.json() skipped it
    if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
      try {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
        }
        if (raw) {
          const params = new URLSearchParams(raw);
          for (const [k, v] of params.entries()) {
            body[k] = v;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    const grantType = String(body["grant_type"] ?? "");
    const code = String(body["code"] ?? "");
    const clientId = String(body["client_id"] ?? "");
    const redirectUri = String(body["redirect_uri"] ?? "");
    if (grantType !== "authorization_code" || !code || !clientId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    const stored = await prisma.oauthCode.findUnique({ where: { code } });
    if (!stored || stored.clientId !== clientId || (redirectUri && stored.redirectUri !== redirectUri)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }
    await prisma.oauthCode.delete({ where: { code } });
    const accessToken = `atk_${randomUUID()}`;
    await prisma.oauthToken.create({
      data: { token: accessToken, email: stored.email, role: stored.role },
    });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: "mcp",
      })
    );
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

  registerSystem2030SessionsRoutes(app, requireAdminSecret);
  registerRoleRoutes(app, requireAdminSecret);

  // Registry API (dynamic tools/resources/rules + plugin configs mirror).
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

  // Prompts API (for Admin panel). DB-backed via RegistryPrompt.
  app.get("/api/prompts", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const rows = await prisma.registryPrompt.findMany({ orderBy: { name: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, prompts: rows }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.put("/api/prompts", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as Record<string, unknown>) : {};
      const prompts = Array.isArray(body["prompts"]) ? (body["prompts"] as any[]) : [];
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.registryPrompt.deleteMany({});
        for (const p of prompts) {
          const name = String(p?.name ?? "").trim();
          if (!name) continue;
          const allowedRoles = p.allowedRoles;
          if (allowedRoles !== undefined) {
            const v = await validateAllowedRoles(allowedRoles);
            if (!v.ok) throw new Error(v.error);
            p.allowedRoles = v.value;
          }
          await tx.registryPrompt.create({
            data: {
              name,
              description: p.description ? String(p.description) : null,
              content: String(p.content ?? ""),
              enabled: p.enabled !== false,
              allowedRoles: (p.allowedRoles ?? null) as any,
              source: (p.source ?? "admin") as any,
              origin: p.origin ? String(p.origin) : null,
            },
          });
        }
      });
      const updated = await prisma.registryPrompt.findMany({ orderBy: { name: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, prompts: updated }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  // Skills API (for Admin panel). DB-backed via RegistrySkill.
  app.get("/api/skills", async (req: IncomingMessage, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const rows = await prisma.registrySkill.findMany({ orderBy: { name: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, skills: rows }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
  });

  app.put("/api/skills", async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const auth = requireAdminSecret(req);
    if (!auth.ok) {
      res.statusCode = auth.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    try {
      const body = (req.body && typeof req.body === "object") ? (req.body as Record<string, unknown>) : {};
      const skills = Array.isArray(body["skills"]) ? (body["skills"] as any[]) : [];
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.registrySkill.deleteMany({});
        for (const s of skills) {
          const name = String(s?.name ?? "").trim();
          if (!name) continue;
          const allowedRoles = s.allowedRoles;
          if (allowedRoles !== undefined) {
            const v = await validateAllowedRoles(allowedRoles);
            if (!v.ok) throw new Error(v.error);
            s.allowedRoles = v.value;
          }
          await tx.registrySkill.create({
            data: {
              name,
              description: s.description ? String(s.description) : null,
              content: String(s.content ?? ""),
              definition: (s.definition ?? null) as any,
              enabled: s.enabled !== false,
              allowedRoles: (s.allowedRoles ?? null) as any,
              source: (s.source ?? "admin") as any,
              origin: s.origin ? String(s.origin) : null,
            },
          });
        }
      });
      const updated = await prisma.registrySkill.findMany({ orderBy: { name: "asc" } });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, skills: updated }));
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

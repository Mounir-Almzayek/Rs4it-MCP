import type { IncomingMessage, ServerResponse } from "node:http";
import { loadRoleConfig, writeRoleConfig } from "../../config/roles.js";

type RequireAdminSecret = (
  req: IncomingMessage
) => { ok: true } | { ok: false; status: number; error: string };

export function registerRoleRoutes(app: any, requireAdminSecret: RequireAdminSecret): void {
  // Roles API (for Admin panel).
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
}


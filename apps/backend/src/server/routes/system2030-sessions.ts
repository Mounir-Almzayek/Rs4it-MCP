import type { IncomingMessage, ServerResponse } from "node:http";
import {
  listSystem2030Sessions,
  deleteSystem2030SessionByEmail,
} from "../../integrations/system2030/store.js";

type RequireAdminSecret = (
  req: IncomingMessage
) => { ok: true } | { ok: false; status: number; error: string };

export function registerSystem2030SessionsRoutes(
  app: any,
  requireAdminSecret: RequireAdminSecret
): void {
  // System2030 Sessions API (for Admin panel).
  // Protected by MCP_ADMIN_API_SECRET if set/required.
  app.get(
    "/api/system2030-sessions",
    async (req: IncomingMessage, res: ServerResponse) => {
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
        res.end(
          JSON.stringify({
            ok: true,
            sessions: sessions.map((s) => ({
              ...s,
              token: undefined,
              notificationToken: undefined,
            })),
          })
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: msg }));
      }
    }
  );

  app.delete(
    "/api/system2030-sessions",
    async (req: IncomingMessage, res: ServerResponse) => {
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
    }
  );
}


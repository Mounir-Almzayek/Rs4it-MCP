import { z } from "zod";
import type { RegisteredTool, ToolCallResult } from "../types/tools.js";
import { system2030Login, system2030Me } from "../integrations/system2030/client.js";
import {
  getSystem2030SessionByEmail,
  listSystem2030Sessions,
  upsertSystem2030Session,
} from "../integrations/system2030/store.js";

export const SYSTEM2030_AUTH_REFRESH_NAME = "system2030_auth_refresh" as const;

const inputSchema = {
  email: z.string().email().describe("System2030 account email. If omitted, uses SYSTEM2030_EMAIL env var.").optional(),
  password: z.string().min(1).describe("System2030 password. Only required on first login or when forceLogin=true. If omitted, uses SYSTEM2030_PASSWORD env var.").optional(),
  baseUrl: z.string().url().optional().describe("Override base URL (default: https://server.system2030.com or SYSTEM2030_BASE_URL)."),
  forceLogin: z.boolean().optional().default(false).describe("Force calling /auth/login even if a stored token exists."),
  returnFields: z.array(z.string()).optional().describe("Optional: return only these programmer fields (e.g. ['id','name','email']). Default returns full programmer object."),
};

export type System2030AuthRefreshArgs = z.infer<z.ZodObject<typeof inputSchema>>;

function ok(payload: unknown): ToolCallResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: false };
}

function err(message: string): ToolCallResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

function pick(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = obj[f];
  return out;
}

async function handler(args: System2030AuthRefreshArgs): Promise<ToolCallResult> {
  try {
    let email = (args.email ?? process.env["SYSTEM2030_EMAIL"] ?? "").trim();
    if (!email) {
      const latest = (await listSystem2030Sessions())[0];
      email = latest?.email?.trim() ?? "";
    }
    if (!email) return err('Missing "email" (or set SYSTEM2030_EMAIL).');

    const stored = await getSystem2030SessionByEmail(email);
    let token = stored?.token;
    let notificationToken = stored?.notificationToken;
    let userId = stored?.userId;

    const needLogin = args.forceLogin || !token;
    if (needLogin) {
      const password = (args.password ?? process.env["SYSTEM2030_PASSWORD"] ?? "").trim();
      if (!password) return err('Missing "password" for first login (or set SYSTEM2030_PASSWORD).');
      const login = await system2030Login({ email, password, baseUrl: args.baseUrl });
      token = login.token;
      notificationToken = login.notificationToken ?? notificationToken;
      userId = login.user?.id ?? userId;
      await upsertSystem2030Session({
        email,
        token,
        notificationToken,
        userId,
        lastLoginAt: new Date().toISOString(),
      });
    }

    // Always refresh programmer snapshot via /auth/me (requested behavior).
    let programmer;
    try {
      programmer = await system2030Me({ token: token!, baseUrl: args.baseUrl });
    } catch (e) {
      // If token expired/invalid, re-login once (if password available), then retry /me.
      const msg = e instanceof Error ? e.message : String(e);
      const password = (args.password ?? process.env["SYSTEM2030_PASSWORD"] ?? "").trim();
      if (!password) return err(msg);
      const login = await system2030Login({ email, password, baseUrl: args.baseUrl });
      token = login.token;
      notificationToken = login.notificationToken ?? notificationToken;
      userId = login.user?.id ?? userId;
      await upsertSystem2030Session({
        email,
        token,
        notificationToken,
        userId,
        lastLoginAt: new Date().toISOString(),
      });
      programmer = await system2030Me({ token: token!, baseUrl: args.baseUrl });
    }

    const now = new Date().toISOString();
    await upsertSystem2030Session({
      email,
      token: token!,
      notificationToken,
      userId,
      programmer,
      lastMeAt: now,
    });

    const programmerObj = programmer as unknown as Record<string, unknown>;
    const resultProgrammer =
      args.returnFields && args.returnFields.length > 0
        ? pick(programmerObj, args.returnFields)
        : programmerObj;

    return ok({
      ok: true,
      email,
      userId,
      hasNotificationToken: Boolean(notificationToken),
      refreshedAt: now,
      programmer: resultProgrammer,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(msg);
  }
}

export const system2030AuthRefreshTool: RegisteredTool<System2030AuthRefreshArgs> = {
  name: SYSTEM2030_AUTH_REFRESH_NAME,
  description:
    "System2030 smart auth refresh: first time login with email+password, then refresh programmer snapshot via /auth/me and persist token+programmer locally.",
  inputSchema,
  handler,
};


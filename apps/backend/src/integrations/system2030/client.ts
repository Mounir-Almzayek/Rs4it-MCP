import type {
  System2030LoginResponse,
  System2030MeResponse,
  System2030Programmer,
} from "./types.js";

function baseUrlFromEnvOrArg(baseUrl?: string): string {
  const raw = (baseUrl ?? process.env["SYSTEM2030_BASE_URL"] ?? "https://server.system2030.com").trim();
  return raw.replace(/\/$/, "");
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

function toErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "Unknown error";
  const o = payload as Record<string, unknown>;
  const msg = typeof o["message"] === "string" ? o["message"] : undefined;
  if (msg) return msg;
  return JSON.stringify(payload);
}

export async function system2030Login(args: {
  email: string;
  password: string;
  baseUrl?: string;
}): Promise<{ token: string; notificationToken?: string; user?: { id: number; email: string } }> {
  const base = baseUrlFromEnvOrArg(args.baseUrl);
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: args.email, password: args.password }),
  });
  const payload = (await readJsonOrText(res)) as System2030LoginResponse;
  if (!res.ok || !payload?.data?.token) {
    throw new Error(`System2030 login failed (${res.status}): ${toErrorMessage(payload)}`);
  }
  return {
    token: payload.data.token,
    notificationToken: payload.data.notificationToken,
    user: payload.data.user?.id && payload.data.user?.email ? { id: payload.data.user.id, email: payload.data.user.email } : undefined,
  };
}

export async function system2030Me(args: { token: string; baseUrl?: string }): Promise<System2030Programmer> {
  const base = baseUrlFromEnvOrArg(args.baseUrl);
  const res = await fetch(`${base}/auth/me`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${args.token}` },
  });
  const payload = (await readJsonOrText(res)) as System2030MeResponse;
  if (!res.ok) {
    throw new Error(`System2030 /auth/me failed (${res.status}): ${toErrorMessage(payload)}`);
  }

  // Prefer {data: programmer}, fallback to direct object.
  const data = (payload && typeof payload === "object" && "data" in payload) ? (payload as System2030MeResponse).data : undefined;
  const programmer = (data && typeof data === "object") ? (data as System2030Programmer) : (payload as unknown as System2030Programmer);
  if (!programmer || typeof programmer !== "object" || typeof (programmer as System2030Programmer).id !== "number") {
    throw new Error("System2030 /auth/me returned unexpected payload shape.");
  }
  return programmer;
}


/**
 * Admin: read role config from Hub (DB-backed).
 *
 * NOTE: Hub stores roles in its database; Admin should not read a local roles.json,
 * otherwise role validation diverges and produces "Unknown role id(s)" errors.
 */

export interface RoleDefinition {
  id: string;
  name?: string;
  inherits?: string[];
}

export interface RoleConfig {
  defaultRole?: string;
  roles: RoleDefinition[];
}

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function readRoleConfig(): Promise<RoleConfig> {
  try {
    // Guard: this should only run server-side.
    if (typeof window !== "undefined") return { roles: [] };

    const res = await fetch(`${hubBaseUrl()}/api/roles`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    const payload = (await res.json()) as { ok?: boolean; config?: unknown; error?: unknown };
    if (!res.ok || payload?.ok === false) return { roles: [] };
    const cfg = payload?.config as RoleConfig | undefined;
    if (!cfg || typeof cfg !== "object" || !Array.isArray(cfg.roles)) return { roles: [] };
    return cfg;
  } catch {
    return { roles: [] };
  }
}

export async function writeRoleConfig(config: RoleConfig): Promise<void> {
  // Guard: server-only.
  if (typeof window !== "undefined") return;
  await fetch(`${hubBaseUrl()}/api/roles`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(config),
    cache: "no-store",
  });
}

/**
 * Load role config and resolve effective roles (inheritance) for visibility (Phase 09).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { RoleConfig, RoleDefinition } from "../types/roles.js";

const DEFAULT_PATH = "config/roles.json";

function getRolesConfigPath(): string {
  const env = process.env["MCP_ROLES_CONFIG"];
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), DEFAULT_PATH);
}

let cachedConfig: RoleConfig | null = null;

export function clearRoleConfigCache(): void {
  cachedConfig = null;
}

/**
 * Load role config from file. Cached for the process.
 */
export async function loadRoleConfig(): Promise<RoleConfig> {
  if (cachedConfig) return cachedConfig;
  const filePath = getRolesConfigPath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !Array.isArray((data as RoleConfig).roles)) {
      cachedConfig = { roles: [] };
      return cachedConfig;
    }
    cachedConfig = data as RoleConfig;
    return cachedConfig;
  } catch {
    cachedConfig = { roles: [] };
    return cachedConfig;
  }
}

/**
 * Persist role config to disk and clear cache.
 */
export async function writeRoleConfig(config: RoleConfig): Promise<void> {
  const filePath = getRolesConfigPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
  clearRoleConfigCache();
}

export type ValidateAllowedRolesOk = { ok: true; value: string[] | undefined };
export type ValidateAllowedRolesErr = { ok: false; error: string };

/**
 * Validate allowedRoles against known roles.
 * - undefined → ok(undefined)
 * - [] → ok(undefined) (means visible to all)
 * - unknown role ids → error
 */
export async function validateAllowedRoles(
  allowedRoles: unknown
): Promise<ValidateAllowedRolesOk | ValidateAllowedRolesErr> {
  if (allowedRoles === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(allowedRoles)) {
    return { ok: false, error: "allowedRoles must be an array of role ids" };
  }
  const cleaned = allowedRoles.map((r) => String(r ?? "").trim());
  const emptyIdx = cleaned.findIndex((r) => !r);
  if (emptyIdx !== -1) return { ok: false, error: "allowedRoles cannot contain empty role ids" };
  const cfg = await loadRoleConfig();
  const known = new Set((cfg.roles ?? []).map((r) => r.id));
  const unknown = [...new Set(cleaned.filter((r) => !known.has(r)))];
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown role id(s): ${unknown.join(", ")}` };
  }
  const uniq = [...new Set(cleaned)];
  return { ok: true, value: uniq.length > 0 ? uniq : undefined };
}

/**
 * Resolve effective role ids for a given role (the role itself + all inherited, transitively).
 * Used to decide visibility: user has role R → effective = [R, ...inherited] → show tool if tool.allowedRoles intersects effective.
 */
export async function getEffectiveRoles(roleId: string): Promise<string[]> {
  const config = await loadRoleConfig();
  const byId = new Map<string, RoleDefinition>();
  for (const r of config.roles) {
    byId.set(r.id, r);
  }
  const result = new Set<string>();

  function add(rId: string): void {
    if (result.has(rId)) return;
    result.add(rId);
    const def = byId.get(rId);
    if (def?.inherits) {
      for (const parent of def.inherits) {
        add(parent);
      }
    }
  }

  add(roleId);
  return Array.from(result);
}

/**
 * True if the entity is visible for the given user role.
 * - If allowedRoles is missing or empty → visible to all (true).
 * - Else visible if any of the user's effective roles is in allowedRoles.
 */
export async function isAllowedForRole(
  allowedRoles: string[] | undefined,
  userRoleId: string
): Promise<boolean> {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const effective = await getEffectiveRoles(userRoleId);
  return effective.some((r) => allowedRoles.includes(r));
}

/**
 * Default role when client does not send one (e.g. Cursor without role header).
 */
export async function getDefaultRole(): Promise<string | undefined> {
  const config = await loadRoleConfig();
  return config.defaultRole;
}

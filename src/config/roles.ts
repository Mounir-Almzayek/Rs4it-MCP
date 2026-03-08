/**
 * Load role config and resolve effective roles (inheritance) for visibility (Phase 09).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RoleConfig, RoleDefinition } from "../types/roles.js";

const DEFAULT_PATH = "config/roles.json";

function getRolesConfigPath(): string {
  const env = process.env["MCP_ROLES_CONFIG"];
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), DEFAULT_PATH);
}

let cachedConfig: RoleConfig | null = null;

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

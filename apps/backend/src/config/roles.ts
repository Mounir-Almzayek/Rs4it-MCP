/**
 * Load role config and resolve effective roles (inheritance) for visibility (Phase 09).
 */

import type { RoleConfig, RoleDefinition } from "../types/roles.js";
import { prisma } from "../db/prisma.js";
import type { Prisma } from "@prisma/client";

let cachedConfig: RoleConfig | null = null;
const ADMIN_ROLE_ID = "admin";
const ADMIN_ROLE_NAME = "Admin";

export function clearRoleConfigCache(): void {
  cachedConfig = null;
}

/**
 * Load role config from DB. Cached for the process.
 */
export async function loadRoleConfig(): Promise<RoleConfig> {
  if (cachedConfig) return cachedConfig;
  let [roles, edges, setting] = await Promise.all([
    prisma.role.findMany({ orderBy: { id: "asc" } }),
    prisma.roleInheritance.findMany(),
    prisma.appSetting.findUnique({ where: { key: "defaultRole" } }),
  ]);
  const hasAdminRole = roles.some((r: { id: string }) => r.id === ADMIN_ROLE_ID);
  if (!hasAdminRole) {
    await prisma.role.upsert({
      where: { id: ADMIN_ROLE_ID },
      create: { id: ADMIN_ROLE_ID, name: ADMIN_ROLE_NAME },
      update: {},
    });
    if (!setting?.value) {
      await prisma.appSetting.upsert({
        where: { key: "defaultRole" },
        create: { key: "defaultRole", value: ADMIN_ROLE_ID },
        update: { value: ADMIN_ROLE_ID },
      });
    }
    [roles, edges, setting] = await Promise.all([
      prisma.role.findMany({ orderBy: { id: "asc" } }),
      prisma.roleInheritance.findMany(),
      prisma.appSetting.findUnique({ where: { key: "defaultRole" } }),
    ]);
  }
  const inheritsByChild = new Map<string, string[]>();
  for (const e of edges) {
    const arr = inheritsByChild.get(e.childId) ?? [];
    arr.push(e.parentId);
    inheritsByChild.set(e.childId, arr);
  }
  cachedConfig = {
    defaultRole: setting?.value ?? undefined,
    roles: roles.map((r: { id: string; name: string }) => ({
      id: r.id,
      name: r.name,
      inherits: inheritsByChild.get(r.id),
    })),
  };
  return cachedConfig;
}

/**
 * Persist role config to DB and clear cache.
 */
export async function writeRoleConfig(config: RoleConfig): Promise<void> {
  const roles = Array.isArray(config.roles) ? [...config.roles] : [];
  if (!roles.some((r) => String(r.id ?? "").trim() === ADMIN_ROLE_ID)) {
    roles.unshift({ id: ADMIN_ROLE_ID, name: ADMIN_ROLE_NAME });
  }
  const roleIds = [...new Set(roles.map((r) => String(r.id ?? "").trim()).filter(Boolean))];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Upsert roles
    for (const r of roles) {
      const id = String(r.id ?? "").trim();
      if (!id) continue;
      const name = (r.name && String(r.name).trim()) ? String(r.name).trim() : id;
      await tx.role.upsert({
        where: { id },
        create: { id, name },
        update: { name },
      });
    }

    // Remove roles not present in new config (also removes inherit edges via cascade)
    await tx.role.deleteMany({ where: { id: { notIn: roleIds } } });

    // Rebuild inheritance edges
    await tx.roleInheritance.deleteMany({});
    for (const r of roles) {
      const childId = String(r.id ?? "").trim();
      if (!childId) continue;
      const inherits = Array.isArray(r.inherits) ? r.inherits : [];
      for (const p of inherits) {
        const parentId = String(p ?? "").trim();
        if (!parentId) continue;
        await tx.roleInheritance.create({ data: { childId, parentId } });
      }
    }

    // Default role setting
    const defaultRole = config.defaultRole !== undefined ? String(config.defaultRole ?? "").trim() : ADMIN_ROLE_ID;
    await tx.appSetting.upsert({
      where: { key: "defaultRole" },
      create: { key: "defaultRole", value: defaultRole || null },
      update: { value: defaultRole || null },
    });
  });

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
  const uniq = [...new Set(cleaned.filter((r) => known.has(r)))];
  const unknown = [...new Set(cleaned.filter((r) => !known.has(r)))];
  if (unknown.length > 0) {
    // Keep requests resilient when role ids were removed/renamed:
    // drop unknown ids instead of failing the whole operation.
    console.warn(`[roles] Dropping unknown role id(s) from allowedRoles: ${unknown.join(", ")}`);
  }
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

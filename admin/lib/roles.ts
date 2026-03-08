/**
 * Admin: read/write role config (Phase 09).
 * Same file as Hub uses (config/roles.json or MCP_ROLES_CONFIG).
 */

import path from "path";
import fs from "fs/promises";

export interface RoleDefinition {
  id: string;
  name?: string;
  inherits?: string[];
}

export interface RoleConfig {
  defaultRole?: string;
  roles: RoleDefinition[];
}

const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "roles.json");

function getRolesConfigPath(): string {
  const env = process.env.MCP_ROLES_CONFIG ?? process.env.ADMIN_ROLES_CONFIG;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

export async function readRoleConfig(): Promise<RoleConfig> {
  const filePath = getRolesConfigPath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !Array.isArray((data as RoleConfig).roles)) {
      return { roles: [] };
    }
    return data as RoleConfig;
  } catch {
    return { roles: [] };
  }
}

export async function writeRoleConfig(config: RoleConfig): Promise<void> {
  const filePath = getRolesConfigPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
}

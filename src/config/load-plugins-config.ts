/**
 * Load and validate MCP plugins config (Phase 04) — DB-backed.
 */

import type { PluginConfig } from "../plugins/types.js";
import { prisma } from "../db/prisma.js";

/**
 * Load and parse config from DB. Returns empty list if none configured.
 */
export async function loadPluginsConfig(): Promise<PluginConfig[]> {
  const rows = await prisma.pluginConfig.findMany({
    where: { enabled: true },
    orderBy: { id: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    command: p.command,
    args: Array.isArray(p.args) ? (p.args as unknown as string[]) : [],
    cwd: p.cwd ?? undefined,
    env: (p.env ?? undefined) as Record<string, string> | undefined,
    timeout: p.timeout ?? undefined,
  }));
}

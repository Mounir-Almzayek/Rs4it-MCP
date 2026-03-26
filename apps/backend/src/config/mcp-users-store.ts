/**
 * MCP users store (Phase 11) — DB-backed.
 */
import { prisma } from "../db/prisma.js";

export interface McpUserRecord {
  name: string;
  last_used_at: string;
  first_seen_at?: string;
  request_count?: number;
}

/**
 * Upsert a user by name: create or update last_used_at and optionally first_seen_at and request_count.
 * Safe to call from request path; keep writes fast (single read + single write).
 */
export async function upsertMcpUser(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const now = new Date();
  await prisma.mcpUser.upsert({
    where: { name: trimmed },
    create: { name: trimmed, firstSeenAt: now, lastUsedAt: now, requestCount: 1 },
    update: { lastUsedAt: now, requestCount: { increment: 1 } },
  });
}

/**
 * List all MCP users sorted by last_used_at descending.
 */
export async function listMcpUsers(): Promise<McpUserRecord[]> {
  const rows = await prisma.mcpUser.findMany({ orderBy: { lastUsedAt: "desc" } });
  return rows.map((r: typeof rows[number]) => ({
    name: r.name,
    last_used_at: r.lastUsedAt.toISOString(),
    first_seen_at: r.firstSeenAt.toISOString(),
    request_count: r.requestCount,
  }));
}

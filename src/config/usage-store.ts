/**
 * Usage tracking (Phase 12) — DB-backed.
 */

import { prisma } from "../db/prisma.js";

export interface UsageEvent {
  toolName: string;
  userName?: string;
  timestamp: string;
}

export interface EntityStats {
  total: number;
  byUser: Record<string, number>;
}

export interface UsageStats {
  byEntity: Record<string, EntityStats>;
  recent: UsageEvent[];
}

const MAX_EVENTS = 50_000;

/**
 * Record one invocation. Fire-and-forget; safe to call from request path.
 */
export function recordInvocation(toolName: string, userName?: string): void {
  const event: UsageEvent = {
    toolName,
    userName: userName?.trim() || undefined,
    timestamp: new Date().toISOString(),
  };
  void (async () => {
    try {
      await prisma.usageEvent.create({
        data: {
          toolName: event.toolName,
          userName: event.userName ?? null,
          timestamp: new Date(event.timestamp),
        },
      });
      // Keep DB bounded (best-effort).
      const count = await prisma.usageEvent.count();
      if (count > MAX_EVENTS) {
        const toDelete = count - MAX_EVENTS;
        const oldest = await prisma.usageEvent.findMany({
          orderBy: { timestamp: "asc" },
          take: toDelete,
          select: { id: true },
        });
        if (oldest.length > 0) {
          await prisma.usageEvent.deleteMany({ where: { id: { in: oldest.map((x) => x.id) } } });
        }
      }
    } catch (err) {
      console.error("[rs4it-mcp] Usage record error:", err);
    }
  })();
}

/**
 * Aggregate events into stats by entity and by user. Optionally limit recent list.
 */
export async function getUsageStats(options?: {
  recentLimit?: number;
  since?: string;
}): Promise<UsageStats> {
  const since = options?.since ? new Date(options.since) : undefined;
  const rows = await prisma.usageEvent.findMany({
    where: since ? { timestamp: { gte: since } } : undefined,
    orderBy: { timestamp: "asc" },
  });
  const events: UsageEvent[] = rows.map((r) => ({
    toolName: r.toolName,
    userName: r.userName ?? undefined,
    timestamp: r.timestamp.toISOString(),
  }));
  const byEntity: Record<string, EntityStats> = {};
  for (const e of events) {
    const name = e.toolName;
    if (!byEntity[name]) {
      byEntity[name] = { total: 0, byUser: {} };
    }
    const ent = byEntity[name]!;
    ent.total += 1;
    const u = e.userName ?? "anonymous";
    ent.byUser[u] = (ent.byUser[u] ?? 0) + 1;
  }
  const recentLimit = options?.recentLimit ?? 100;
  const recent = [...events].reverse().slice(0, recentLimit);
  return { byEntity, recent };
}

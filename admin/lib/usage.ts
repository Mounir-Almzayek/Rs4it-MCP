/**
 * Admin: read usage stats (Phase 12) — server only.
 * Same file as Hub writes to (config/mcp_usage.json or MCP_USAGE_FILE).
 * For types and entityType, use @/lib/usage-types in client code.
 */

import path from "path";
import fs from "fs/promises";
import type { UsageEvent, EntityStats, UsageStats } from "./usage-types";

const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "mcp_usage.json");

function getUsagePath(): string {
  const env = process.env.MCP_USAGE_FILE ?? process.env.ADMIN_MCP_USAGE_FILE;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

async function loadEvents(): Promise<UsageEvent[]> {
  const filePath = getUsagePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return [];
    const list = Array.isArray((data as { events?: unknown }).events)
      ? (data as { events: UsageEvent[] }).events
      : [];
    return list.filter(
      (e): e is UsageEvent =>
        !!e &&
        typeof e === "object" &&
        typeof (e as UsageEvent).toolName === "string" &&
        typeof (e as UsageEvent).timestamp === "string"
    );
  } catch {
    return [];
  }
}

export async function readUsageStats(options?: {
  recentLimit?: number;
  since?: string;
}): Promise<UsageStats> {
  let events = await loadEvents();
  const since = options?.since;
  if (since) {
    events = events.filter((e) => e.timestamp >= since);
  }
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

/**
 * Usage tracking (Phase 12).
 * Records each tool/skill/plugin invocation with tool name and caller (user name or anonymous).
 * Aggregated stats are read by the admin panel.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

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

const DEFAULT_FILENAME = "mcp_usage.json";
const DEFAULT_PATH = path.resolve(process.cwd(), "config", DEFAULT_FILENAME);
const MAX_EVENTS = 50_000;

function getStorePath(): string {
  const env = process.env["MCP_USAGE_FILE"];
  if (env) return path.resolve(env);
  return DEFAULT_PATH;
}

interface StoreData {
  events: UsageEvent[];
}

async function loadEvents(): Promise<UsageEvent[]> {
  const filePath = getStorePath();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];
  const list = Array.isArray((data as StoreData).events) ? (data as StoreData).events : [];
  return list.filter(
    (e): e is UsageEvent =>
      !!e &&
      typeof e === "object" &&
      typeof (e as UsageEvent).toolName === "string" &&
      typeof (e as UsageEvent).timestamp === "string"
  );
}

async function saveEvents(events: UsageEvent[]): Promise<void> {
  const filePath = getStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = JSON.stringify({ events }, null, 2);
  await writeFile(filePath, payload, "utf-8");
}

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
      const events = await loadEvents();
      events.push(event);
      const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
      await saveEvents(trimmed);
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

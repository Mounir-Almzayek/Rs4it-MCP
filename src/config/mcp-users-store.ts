/**
 * MCP users store (Phase 11).
 * Persists connector name and last_used_at (and optional first_seen_at, request_count)
 * to a JSON file shared with the admin panel.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface McpUserRecord {
  name: string;
  last_used_at: string;
  first_seen_at?: string;
  request_count?: number;
}

const DEFAULT_FILENAME = "mcp_users.json";
const DEFAULT_PATH = path.resolve(process.cwd(), "config", DEFAULT_FILENAME);

function getStorePath(): string {
  const env = process.env["MCP_USERS_FILE"];
  if (env) return path.resolve(env);
  return DEFAULT_PATH;
}

async function loadRecords(): Promise<McpUserRecord[]> {
  const filePath = getStorePath();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const list = Array.isArray(o.users) ? o.users : [];
  return list.filter(
    (x): x is McpUserRecord =>
      !!x &&
      typeof x === "object" &&
      typeof (x as McpUserRecord).name === "string" &&
      typeof (x as McpUserRecord).last_used_at === "string"
  );
}

async function saveRecords(records: McpUserRecord[]): Promise<void> {
  const filePath = getStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = JSON.stringify({ users: records }, null, 2);
  await writeFile(filePath, payload, "utf-8");
}

/**
 * Upsert a user by name: create or update last_used_at and optionally first_seen_at and request_count.
 * Safe to call from request path; keep writes fast (single read + single write).
 */
export async function upsertMcpUser(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const now = new Date().toISOString();
  const records = await loadRecords();
  const idx = records.findIndex((r) => r.name === trimmed);

  if (idx >= 0) {
    const r = records[idx]!;
    r.last_used_at = now;
    r.request_count = (r.request_count ?? 0) + 1;
  } else {
    records.push({
      name: trimmed,
      last_used_at: now,
      first_seen_at: now,
      request_count: 1,
    });
  }

  await saveRecords(records);
}

/**
 * List all MCP users sorted by last_used_at descending.
 */
export async function listMcpUsers(): Promise<McpUserRecord[]> {
  const records = await loadRecords();
  records.sort((a, b) => (b.last_used_at < a.last_used_at ? -1 : 1));
  return records;
}

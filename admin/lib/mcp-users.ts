/**
 * Admin: read MCP users list (Phase 11).
 * Same file as Hub writes to (config/mcp_users.json or MCP_USERS_FILE).
 */

import path from "path";
import fs from "fs/promises";

export interface McpUserRecord {
  name: string;
  last_used_at: string;
  first_seen_at?: string;
  request_count?: number;
}

const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "mcp_users.json");

function getMcpUsersPath(): string {
  const env = process.env.MCP_USERS_FILE ?? process.env.ADMIN_MCP_USERS_FILE;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

export async function readMcpUsers(): Promise<McpUserRecord[]> {
  const filePath = getMcpUsersPath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return [];
    const list = Array.isArray((data as { users?: unknown }).users)
      ? (data as { users: McpUserRecord[] }).users
      : [];
    const records = list.filter(
      (x): x is McpUserRecord =>
        !!x &&
        typeof x === "object" &&
        typeof (x as McpUserRecord).name === "string" &&
        typeof (x as McpUserRecord).last_used_at === "string"
    );
    records.sort((a, b) => (b.last_used_at < a.last_used_at ? -1 : 1));
    return records;
  } catch {
    return [];
  }
}

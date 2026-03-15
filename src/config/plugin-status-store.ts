/**
 * Plugin connection status (written by Hub at startup, read by Admin).
 * Allows verifying that each MCP plugin connected correctly and has its tools available.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface PluginConnectionEntry {
  id: string;
  name: string;
  /** "connected" = Hub connected and got tools/list; "failed" = connect or listTools failed. */
  status: "connected" | "failed";
  /** Number of tools exposed (when status is connected). */
  toolsCount?: number;
  /** Error message when status is failed. */
  error?: string;
}

export interface PluginStatusSnapshot {
  updatedAt: string;
  plugins: PluginConnectionEntry[];
}

const DEFAULT_FILENAME = "mcp_plugin_status.json";
const DEFAULT_PATH = path.resolve(process.cwd(), "config", DEFAULT_FILENAME);

export function getPluginStatusPath(): string {
  const env = process.env["MCP_PLUGIN_STATUS_FILE"] ?? process.env["ADMIN_MCP_PLUGIN_STATUS_FILE"];
  if (env) return path.resolve(env);
  return DEFAULT_PATH;
}

/**
 * Write plugin connection status to file. Call from Hub after loadAllPlugins().
 */
export async function writePluginStatus(entries: PluginConnectionEntry[]): Promise<void> {
  const filePath = getPluginStatusPath();
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const snapshot: PluginStatusSnapshot = {
    updatedAt: new Date().toISOString(),
    plugins: entries,
  };
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * Read plugin status from file. Used by Admin API (server-side).
 */
export async function readPluginStatus(): Promise<PluginStatusSnapshot | null> {
  const filePath = getPluginStatusPath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !("plugins" in data)) return null;
    const snap = data as { updatedAt?: string; plugins?: unknown[] };
    return {
      updatedAt: typeof snap.updatedAt === "string" ? snap.updatedAt : new Date().toISOString(),
      plugins: Array.isArray(snap.plugins) ? snap.plugins.filter(isPluginConnectionEntry) : [],
    };
  } catch {
    return null;
  }
}

function isPluginConnectionEntry(x: unknown): x is PluginConnectionEntry {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).id === "string" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    ((x as Record<string, unknown>).status === "connected" || (x as Record<string, unknown>).status === "failed")
  );
}

/**
 * Plugin connection status (written by Hub at startup, read by Admin) — DB-backed.
 */

import { prisma } from "../db/prisma.js";

export interface PluginToolRef {
  name: string;
  originalName?: string;
  description?: string;
}

export interface PluginSkillRef {
  name: string;
  originalName?: string;
  description?: string;
}

export interface PluginPromptRef {
  name: string;
  originalName?: string;
  description?: string;
}

export interface PluginResourceRef {
  name: string;
  originalName?: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

export interface PluginConnectionEntry {
  id: string;
  name: string;
  /** "connected" = Hub connected and got tools/list; "failed" = connect or listTools failed. */
  status: "connected" | "failed";
  /** Number of tools exposed (when status is connected). */
  toolsCount?: number;
  /** Tool list for Admin display (when status is connected). Read-only in Tools page. */
  tools?: PluginToolRef[];
  /** Skills from this plugin (read-only in Skills page). */
  skillsCount?: number;
  skills?: PluginSkillRef[];
  /** Prompts from this plugin (read-only in Prompts page). */
  promptsCount?: number;
  prompts?: PluginPromptRef[];
  /** Resources from this plugin (read-only in Resources page). */
  resourcesCount?: number;
  resources?: PluginResourceRef[];
  /** Role ids that can see/use this plugin (inherited by its tools/skills/prompts/resources in Admin). */
  allowedRoles?: string[];
  /** Error message when status is failed. */
  error?: string;
}

export interface PluginStatusSnapshot {
  updatedAt: string;
  plugins: PluginConnectionEntry[];
}

/**
 * Write plugin connection status to DB. Call from Hub after loadAllPlugins().
 */
export async function writePluginStatus(entries: PluginConnectionEntry[]): Promise<void> {
  const snapshot: PluginStatusSnapshot = { updatedAt: new Date().toISOString(), plugins: entries };
  await prisma.pluginStatusSnapshot.upsert({
    where: { key: "latest" },
    create: { key: "latest", updatedAt: new Date(snapshot.updatedAt), plugins: snapshot.plugins as any },
    update: { updatedAt: new Date(snapshot.updatedAt), plugins: snapshot.plugins as any },
  });
}

/**
 * Read plugin status from DB. Used by Hub APIs (server-side).
 */
export async function readPluginStatus(): Promise<PluginStatusSnapshot | null> {
  const row = await prisma.pluginStatusSnapshot.findUnique({ where: { key: "latest" } });
  if (!row) return null;
  const plugins = Array.isArray(row.plugins) ? (row.plugins as any[]).filter(isPluginConnectionEntry) : [];
  return { updatedAt: row.updatedAt.toISOString(), plugins };
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

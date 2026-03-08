/**
 * Admin: resolve path to dynamic registry and read/write (Phase 08).
 * API routes use this to persist changes; Hub reads the same file via MCP_DYNAMIC_CONFIG.
 */

import path from "path";
import fs from "fs/promises";

export interface DynamicSkillStep {
  type: "tool" | "plugin";
  target: string;
  argsMap?: Record<string, string>;
}

export interface DynamicToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handlerRef: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface DynamicSkillEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  steps: DynamicSkillStep[];
  enabled: boolean;
  updatedAt?: string;
}

export interface DynamicPluginEntry {
  id: string;
  name: string;
  command: string;
  args: string[];
  description?: string;
  enabled: boolean;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  skills: DynamicSkillEntry[];
  plugins: DynamicPluginEntry[];
}

const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "dynamic-registry.json");

function getRegistryPath(): string {
  const env = process.env.MCP_DYNAMIC_CONFIG ?? process.env.ADMIN_REGISTRY_PATH;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

export async function readRegistry(): Promise<DynamicRegistry> {
  const filePath = getRegistryPath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object")
      return { tools: [], skills: [], plugins: [] };
    const o = data as Record<string, unknown>;
    return {
      tools: Array.isArray(o.tools) ? o.tools : [],
      skills: Array.isArray(o.skills) ? o.skills : [],
      plugins: Array.isArray(o.plugins) ? o.plugins : [],
    };
  } catch {
    return { tools: [], skills: [], plugins: [] };
  }
}

export async function writeRegistry(registry: DynamicRegistry): Promise<void> {
  const filePath = getRegistryPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(registry, null, 2), "utf-8");
}

/**
 * Admin: resolve path to dynamic registry and read/write (Phase 08).
 * API routes use this to persist changes; Hub reads the same file via MCP_DYNAMIC_CONFIG.
 */

import path from "path";
import fs from "fs/promises";
import fsSync from "fs";

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
  /** Role ids that can see/use this tool (Phase 09). Empty = all roles. */
  allowedRoles?: string[];
}

export interface DynamicSkillEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  steps: DynamicSkillStep[];
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this skill (Phase 09). Empty = all roles. */
  allowedRoles?: string[];
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
  allowedRoles?: string[];
}

export interface DynamicPromptEntry {
  name: string;
  title?: string;
  description: string;
  argsSchema?: Record<string, unknown>;
  template: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
}

export interface DynamicResourceEntry {
  name: string;
  uri: string;
  description?: string;
  mimeType: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
}

export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  skills: DynamicSkillEntry[];
  plugins: DynamicPluginEntry[];
  prompts: DynamicPromptEntry[];
  resources: DynamicResourceEntry[];
}

/** Candidate paths to try (env first, then cwd-relative). Used for read. */
function getRegistryPathCandidates(): string[] {
  const env = process.env.MCP_DYNAMIC_CONFIG ?? process.env.ADMIN_REGISTRY_PATH;
  if (env) return [path.resolve(env)];
  const cwd = process.cwd();
  return [
    path.resolve(cwd, "config", "dynamic-registry.json"),
    path.resolve(cwd, "..", "config", "dynamic-registry.json"),
    path.resolve(cwd, "..", "..", "config", "dynamic-registry.json"),
  ];
}

/** Single path for write: first candidate that exists, or first candidate (so file is created there). */
function getRegistryPathForWrite(): string {
  const candidates = getRegistryPathCandidates();
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return p;
    const dir = path.dirname(p);
    if (fsSync.existsSync(dir)) return p;
  }
  return candidates[0];
}

export async function readRegistry(): Promise<DynamicRegistry> {
  const empty: DynamicRegistry = { tools: [], skills: [], plugins: [], prompts: [], resources: [] };
  const candidates = getRegistryPathCandidates();
  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as unknown;
      if (!data || typeof data !== "object") continue;
      const o = data as Record<string, unknown>;
      return {
        tools: Array.isArray(o.tools) ? o.tools : [],
        skills: Array.isArray(o.skills) ? o.skills : [],
        plugins: Array.isArray(o.plugins) ? o.plugins : [],
        prompts: Array.isArray(o.prompts) ? o.prompts : [],
        resources: Array.isArray(o.resources) ? o.resources : [],
      };
    } catch {
      continue;
    }
  }
  return empty;
}

export async function writeRegistry(registry: DynamicRegistry): Promise<void> {
  const filePath = getRegistryPathForWrite();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(registry, null, 2), "utf-8");
}

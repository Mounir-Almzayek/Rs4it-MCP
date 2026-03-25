/**
 * Load dynamic registry from file (Phase 08).
 * Used by the Hub to merge dynamic tools, skills, and plugins.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { DynamicRegistry } from "../types/dynamic-registry.js";

const DEFAULT_PATH = "config/dynamic-registry.json";

/**
 * Resolve path: MCP_DYNAMIC_CONFIG env or default relative to cwd.
 */
export function getDynamicRegistryPath(): string {
  const env = process.env["MCP_DYNAMIC_CONFIG"];
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), DEFAULT_PATH);
}

/**
 * Persist dynamic registry to disk (Phase 08/02).
 * Used by MCP admin tools to make changes shared for all clients.
 */
export async function writeDynamicRegistry(registry: DynamicRegistry): Promise<void> {
  const filePath = getDynamicRegistryPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(registry, null, 2), "utf-8");
}

/**
 * Load and parse dynamic registry. Returns empty registry if file missing or invalid.
 */
export async function loadDynamicRegistry(): Promise<DynamicRegistry> {
  const filePath = getDynamicRegistryPath();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return { tools: [], skills: [], plugins: [], prompts: [], resources: [], rules: [] };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return { tools: [], skills: [], plugins: [], prompts: [], resources: [], rules: [] };
  }
  if (!data || typeof data !== "object") return { tools: [], skills: [], plugins: [], prompts: [], resources: [], rules: [] };
  const o = data as Record<string, unknown>;
  const normalizeSource = <T extends { source?: string }>(arr: T[]): T[] =>
    arr.map((e) => (e.source === "admin" || e.source === "mcp" ? e : { ...e, source: "admin" as const }));
  return {
    tools: normalizeSource(Array.isArray(o.tools) ? o.tools.filter(isDynamicToolEntry) : []),
    skills: normalizeSource(Array.isArray(o.skills) ? o.skills.filter(isDynamicSkillEntry) : []),
    plugins: normalizeSource(Array.isArray(o.plugins) ? o.plugins.filter(isDynamicPluginEntry) : []),
    prompts: normalizeSource(Array.isArray(o.prompts) ? o.prompts.filter(isDynamicPromptEntry) : []),
    resources: normalizeSource(Array.isArray(o.resources) ? o.resources.filter(isDynamicResourceEntry) : []),
    rules: normalizeSource(Array.isArray(o.rules) ? o.rules.filter(isDynamicRuleEntry) : []),
  };
}

function isDynamicPromptEntry(x: unknown): x is DynamicRegistry["prompts"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    typeof (x as Record<string, unknown>).template === "string" &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

function isDynamicResourceEntry(x: unknown): x is DynamicRegistry["resources"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    typeof (x as Record<string, unknown>).uri === "string" &&
    typeof (x as Record<string, unknown>).mimeType === "string" &&
    typeof (x as Record<string, unknown>).content === "string" &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

function isDynamicToolEntry(x: unknown): x is DynamicRegistry["tools"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    typeof (x as Record<string, unknown>).handlerRef === "string" &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

function isDynamicSkillEntry(x: unknown): x is DynamicRegistry["skills"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    typeof (x as Record<string, unknown>).instructions === "string" &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

function isDynamicPluginEntry(x: unknown): x is DynamicRegistry["plugins"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).id === "string" &&
    typeof (x as Record<string, unknown>).command === "string" &&
    Array.isArray((x as Record<string, unknown>).args) &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

function isDynamicRuleEntry(x: unknown): x is DynamicRegistry["rules"][0] {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Record<string, unknown>).name === "string" &&
    typeof (x as Record<string, unknown>).content === "string" &&
    typeof (x as Record<string, unknown>).enabled === "boolean"
  );
}

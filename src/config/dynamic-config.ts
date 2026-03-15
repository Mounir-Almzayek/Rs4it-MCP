/**
 * Load dynamic registry from file (Phase 08).
 * Used by the Hub to merge dynamic tools, skills, and plugins.
 */

import { readFile } from "node:fs/promises";
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
 * Load and parse dynamic registry. Returns empty registry if file missing or invalid.
 */
export async function loadDynamicRegistry(): Promise<DynamicRegistry> {
  const filePath = getDynamicRegistryPath();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return { tools: [], skills: [], plugins: [], prompts: [], resources: [] };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return { tools: [], skills: [], plugins: [], prompts: [], resources: [] };
  }
  if (!data || typeof data !== "object") return { tools: [], skills: [], plugins: [], prompts: [], resources: [] };
  const o = data as Record<string, unknown>;
  const normalizeSource = <T extends { source?: string }>(arr: T[]): T[] =>
    arr.map((e) => (e.source === "admin" || e.source === "mcp" ? e : { ...e, source: "admin" as const }));
  return {
    tools: normalizeSource(Array.isArray(o.tools) ? o.tools.filter(isDynamicToolEntry) : []),
    skills: normalizeSource(Array.isArray(o.skills) ? o.skills.filter(isDynamicSkillEntry) : []),
    plugins: normalizeSource(Array.isArray(o.plugins) ? o.plugins.filter(isDynamicPluginEntry) : []),
    prompts: normalizeSource(Array.isArray(o.prompts) ? o.prompts.filter(isDynamicPromptEntry) : []),
    resources: normalizeSource(Array.isArray(o.resources) ? o.resources.filter(isDynamicResourceEntry) : []),
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
    Array.isArray((x as Record<string, unknown>).steps) &&
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

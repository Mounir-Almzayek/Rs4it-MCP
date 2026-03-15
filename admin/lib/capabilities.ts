/**
 * Admin: read capabilities snapshot written by the Hub (Phase 14).
 * Same config directory as dynamic-registry; snapshot is updated on each MCP connection.
 */

import path from "path";
import fs from "fs/promises";

export interface SnapshotTool {
  name: string;
  description?: string;
  source: "built-in" | "skill" | "dynamic" | "plugin";
  pluginId?: string;
}

export interface SnapshotPrompt {
  name: string;
  description?: string;
  source: "dynamic";
}

export interface SnapshotResource {
  name: string;
  uri: string;
  description?: string;
  source: "dynamic";
}

export interface CapabilitiesSnapshot {
  updatedAt: string;
  tools: SnapshotTool[];
  prompts: SnapshotPrompt[];
  resources: SnapshotResource[];
}

function getSnapshotPathCandidates(): string[] {
  const env = process.env.MCP_DYNAMIC_CONFIG ?? process.env.ADMIN_REGISTRY_PATH;
  if (env) {
    const dir = path.dirname(path.resolve(env));
    return [path.join(dir, "mcp_capabilities_snapshot.json")];
  }
  const cwd = process.cwd();
  return [
    path.resolve(cwd, "config", "mcp_capabilities_snapshot.json"),
    path.resolve(cwd, "..", "config", "mcp_capabilities_snapshot.json"),
    path.resolve(cwd, "..", "..", "config", "mcp_capabilities_snapshot.json"),
  ];
}

const EMPTY_SNAPSHOT: CapabilitiesSnapshot = {
  updatedAt: "",
  tools: [],
  prompts: [],
  resources: [],
};

export async function readCapabilitiesSnapshot(): Promise<CapabilitiesSnapshot> {
  const candidates = getSnapshotPathCandidates();
  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as unknown;
      if (!data || typeof data !== "object") return EMPTY_SNAPSHOT;
      const o = data as Record<string, unknown>;
      return {
        updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
        tools: Array.isArray(o.tools) ? o.tools : [],
        prompts: Array.isArray(o.prompts) ? o.prompts : [],
        resources: Array.isArray(o.resources) ? o.resources : [],
      };
    } catch {
      continue;
    }
  }
  return EMPTY_SNAPSHOT;
}

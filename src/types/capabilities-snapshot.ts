/**
 * Snapshot of what the Hub exposes (Phase 14).
 * Written on each session creation so the dashboard can show live tools with source attribution.
 */

export type ToolSource = "built-in" | "skill" | "dynamic" | "plugin";

export interface SnapshotTool {
  name: string;
  description?: string;
  source: ToolSource;
  /** Set when source === "plugin" */
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

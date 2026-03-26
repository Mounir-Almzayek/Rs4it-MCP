/**
 * Types for dynamic registry (Phase 08).
 * Tools and plugins manageable from the admin panel.
 */

/** Source of a registry entry: manual from dashboard or from an included MCP. */
export type RegistrySource = "admin" | "mcp";

/** Dynamic tool: definition stored in config, execution via handlerRef (built-in tool name). */
export interface DynamicToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Built-in tool name to invoke (e.g. create_file, run_command). */
  handlerRef: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this tool (Phase 09). Empty = all roles. */
  allowedRoles?: string[];
  /** Phase 14: admin = added manually, mcp = from an included MCP (e.g. imported). */
  source?: RegistrySource;
  /** When source is mcp: plugin id or other origin identifier. */
  origin?: string;
}

/** External MCP plugin entry (same shape as PluginConfig, plus enabled). */
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
  /** Role ids that can see/use this plugin's tools (Phase 09). Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

/** Dynamic resource: static content at a fixed URI, manageable from the dashboard. */
export interface DynamicResourceEntry {
  name: string;
  /** URI (e.g. rs4it://docs/readme). Prefer rs4it:// scheme. */
  uri: string;
  description?: string;
  mimeType: string;
  /** Inline content (text). */
  content: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this resource. Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

/** Dynamic rule: markdown guidance (Cursor-like rules). */
export interface DynamicRuleEntry {
  name: string;
  description: string;
  /** Full rule content (markdown). */
  content: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this rule. Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
  /** Optional file globs (Cursor-like). Not used by the Hub yet. */
  globs?: string;
}

/** Dynamic prompt: text templates surfaced to MCP clients. */
export interface DynamicPromptEntry {
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this prompt. Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export type DynamicSkillStep = {
  tool: string;
  args: Record<string, unknown>;
};

/** Dynamic skill: workflow that runs multiple tool calls. */
export interface DynamicSkillEntry {
  name: string;
  description?: string;
  /** Markdown content (Cursor-style). */
  content: string;
  /** Optional parsed/normalized workflow extracted from markdown. */
  definition?: { inputSchema?: Record<string, unknown>; steps: DynamicSkillStep[] };
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this skill. Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

/** Full dynamic registry file. */
export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  plugins: DynamicPluginEntry[];
  resources: DynamicResourceEntry[];
  rules: DynamicRuleEntry[];
  prompts: DynamicPromptEntry[];
  skills: DynamicSkillEntry[];
}

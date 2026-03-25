/**
 * Types for dynamic registry (Phase 08).
 * Tools, skills, and plugins manageable from the admin panel.
 */

/** One step in a skill workflow (tool call or plugin call). */
export interface DynamicSkillStep {
  type: "tool" | "plugin";
  /** Tool name or plugin:id:toolName */
  target: string;
  /** Optional args override (merge with skill input). */
  argsMap?: Record<string, string>;
}

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

/** Dynamic skill: orchestration steps defined in config. */
export interface DynamicSkillEntry {
  name: string;
  description: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this skill (Phase 09). Empty = all roles. */
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
  /** Full instructions / skill text (markdown). Cursor-like written skill content. */
  instructions: string;
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

/** Dynamic prompt: template-based prompt manageable from the dashboard. */
export interface DynamicPromptEntry {
  name: string;
  title?: string;
  description: string;
  /** Optional JSON schema for prompt arguments (e.g. { topic: { type: "string", description: "..." } }). */
  argsSchema?: Record<string, unknown>;
  /** Message template. Use {{argName}} for substitution when the client passes arguments. */
  template: string;
  enabled: boolean;
  updatedAt?: string;
  /** Role ids that can see/use this prompt. Empty = all roles. */
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

/** Full dynamic registry file. */
export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  skills: DynamicSkillEntry[];
  plugins: DynamicPluginEntry[];
  prompts: DynamicPromptEntry[];
  resources: DynamicResourceEntry[];
  rules: DynamicRuleEntry[];
}

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
}

/** Dynamic skill: orchestration steps defined in config. */
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
}

/** Full dynamic registry file. */
export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  skills: DynamicSkillEntry[];
  plugins: DynamicPluginEntry[];
}

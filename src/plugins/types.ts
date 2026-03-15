/**
 * Types for external MCP plugins (Phase 04).
 */

/**
 * Plugin entry in config (mcp_plugins.json).
 */
export interface PluginConfig {
  /** Unique id for routing and naming (e.g. next-devtools). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Executable (e.g. npx, node). */
  command: string;
  /** Arguments (e.g. ["-y", "package@latest"]). */
  args: string[];
  /** Working directory (optional). */
  cwd?: string;
  /** Extra env vars (optional). */
  env?: Record<string, string>;
  /** Init/tool timeout in ms (optional). */
  timeout?: number;
}

/**
 * Config file shape.
 */
export interface McpPluginsConfig {
  plugins: PluginConfig[];
}

/**
 * Tool from a plugin, with prefixed name for merging in Phase 05.
 */
export interface PluginTool {
  /** Prefixed name (e.g. plugin:next-devtools:run_build). */
  name: string;
  /** Original name on the plugin server. */
  originalName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Result of calling a plugin tool.
 */
export interface PluginToolCallResult {
  content: Array<{ type: string; text?: string; [k: string]: unknown }>;
  isError?: boolean;
}

/**
 * Prompt from a plugin (prefixed name for merging).
 */
export interface PluginPromptRef {
  name: string;
  originalName: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

/**
 * Skill from a plugin (prefixed name for merging; executed via callTool with original name).
 */
export interface PluginSkillRef {
  name: string;
  originalName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Resource from a plugin (prefixed name and virtual URI for Hub; originalUri for plugin readResource).
 */
export interface PluginResourceRef {
  /** Display/registered name (e.g. plugin:id:name). */
  name: string;
  originalName: string;
  /** Virtual URI used by the Hub (e.g. plugin://id/encoded). */
  uri: string;
  /** Original URI to pass to the plugin when reading. */
  originalUri: string;
  description?: string;
  mimeType?: string;
}

/**
 * Loaded plugin: connected client and its tools, skills, prompts, resources.
 */
export interface LoadedPlugin {
  id: string;
  name: string;
  tools: PluginTool[];
  skills: PluginSkillRef[];
  prompts: PluginPromptRef[];
  resources: PluginResourceRef[];
  /** Call a tool by its original name on the plugin server. */
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<PluginToolCallResult>;
  /** Get a prompt by original name (args optional). */
  getPrompt?: (name: string, args?: Record<string, unknown>) => Promise<{ messages: Array<{ role: string; content: { type: string; text?: string } }> }>;
  /** Read a resource by URI (plugin’s original URI or name). */
  readResource?: (uri: string) => Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>;
  /** Close the plugin process. */
  close: () => Promise<void>;
}

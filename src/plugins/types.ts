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
 * Loaded plugin: connected client and its tools.
 */
export interface LoadedPlugin {
  id: string;
  name: string;
  tools: PluginTool[];
  /** Call a tool by its original name on the plugin server. */
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<PluginToolCallResult>;
  /** Close the plugin process. */
  close: () => Promise<void>;
}

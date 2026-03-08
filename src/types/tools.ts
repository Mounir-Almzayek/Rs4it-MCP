/**
 * Tool layer types (Phase 01 + 02).
 * Single source of truth for tool shape: name, description, inputSchema.
 * Handlers are registered in the registry and invoked on tools/call.
 */

/**
 * Description of one MCP tool: name, description, and input schema.
 * Used by the tool registry and for tools/list.
 * inputSchema is typically a Zod object shape (z.object({ ... })) for SDK registration.
 */
export interface ToolDefinition {
  /** Unique tool name (e.g. create_file, run_command). */
  name: string;
  /** Human-readable description for the AI/client. */
  description: string;
  /** Schema for the tool's arguments (MCP inputSchema). Passed to the server as-is (Zod shape). */
  inputSchema: Record<string, unknown>;
}

/**
 * Result shape returned by tool handlers (MCP CallToolResult content).
 */
export interface ToolResultContent {
  type: "text";
  text: string;
}

/**
 * Result of executing a tool. Returned by registry.executeTool and tool handlers.
 */
export interface ToolCallResult {
  content: ToolResultContent[];
  isError?: boolean;
}

/**
 * A registered tool: definition plus async handler. Stored in the registry.
 */
export interface RegisteredTool<TArgs = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: TArgs) => Promise<ToolCallResult>;
}

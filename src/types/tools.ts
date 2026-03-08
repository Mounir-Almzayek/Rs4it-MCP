/**
 * Tool layer types (Phase 01).
 * Describes a single tool for registration and tools/list response.
 * Actual execution is implemented in Phase 02.
 */

/**
 * Description of one MCP tool: name, description, and input schema.
 * Used by the tool registry and when registering tools with the MCP server.
 * inputSchema follows JSON Schema shape; the server may use Zod or JSON Schema for validation.
 */
export interface ToolDefinition {
  /** Unique tool name (e.g. create_file, run_command). */
  name: string;
  /** Human-readable description for the AI/client. */
  description: string;
  /** Schema for the tool's arguments (MCP inputSchema). */
  inputSchema: Record<string, unknown>;
}

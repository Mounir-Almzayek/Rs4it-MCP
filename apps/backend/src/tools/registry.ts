/**
 * Central tool registry: register tools, list for tools/list, execute for tools/call.
 */

import type { RegisteredTool, ToolCallResult } from "../types/tools.js";

const tools = new Map<string, RegisteredTool<unknown>>();

/**
 * Register a tool. Overwrites if the same name exists.
 */
export function registerTool<T>(tool: RegisteredTool<T>): void {
  tools.set(tool.name, tool as RegisteredTool<unknown>);
}

/**
 * Return all registered tools (for tools/list and server registration).
 */
export function getAllTools(): RegisteredTool<unknown>[] {
  return Array.from(tools.values());
}

/**
 * Get a tool by name, or undefined.
 */
export function getTool(name: string): RegisteredTool<unknown> | undefined {
  return tools.get(name);
}

/**
 * Execute a tool by name with the given arguments.
 * Validates that the tool exists; schema validation is done by the server before calling.
 */
export async function executeTool(
  name: string,
  args: unknown
): Promise<ToolCallResult> {
  const tool = tools.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Tool not found: ${name}` }],
      isError: true,
    };
  }
  return tool.handler(args);
}

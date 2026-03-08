/**
 * Unified routing: determine tool source and dispatch tools/call (Phase 05).
 * Use from skill handlers to call any tool by name (local, skill, or plugin).
 */

import type { ToolCallResult } from "./types/tools.js";
import { getToolSource } from "./types/routing.js";
import { executeTool } from "./tools/index.js";
import { executeSkill } from "./skills/index.js";
import { callPluginTool } from "./plugins/index.js";

/**
 * Route a tool call to the correct source (local, skill, plugin) and return a ToolCallResult.
 * Skills can use this to invoke tools from any source (e.g. local create_file + plugin tool).
 */
export async function routeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const source = getToolSource(toolName);
  switch (source.kind) {
    case "local":
      return executeTool(toolName, args);
    case "skill":
      return executeSkill(source.skillName, args);
    case "plugin": {
      const result = await callPluginTool(
        source.pluginId,
        source.originalName,
        args
      );
      return {
        content: result.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
        isError: result.isError,
      };
    }
  }
}

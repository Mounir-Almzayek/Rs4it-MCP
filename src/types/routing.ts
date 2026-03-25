/**
 * Routing types and naming convention (Phase 05).
 * Maps tool name → source for unified tools/list and tools/call.
 */

import { SKILL_TOOL_PREFIX } from "./skills.js";
import { PLUGIN_TOOL_PREFIX } from "../plugins/constants.js";

/**
 * Source of a tool: local registry, skill, or plugin (by id).
 */
export type ToolSource =
  | { kind: "local" }
  | { kind: "skill"; skillName: string }
  | { kind: "plugin"; pluginId: string; originalName: string };

/**
 * Determines the source of a tool from its registered name.
 * Naming convention:
 * - Local: direct name (e.g. create_file, run_command)
 * - Skill: skill:<skill_name> (e.g. skill:create_api_endpoint)
 * - Plugin: plugin_<plugin_id>_<original_tool_name> (e.g. plugin_myplugin_echo)
 */
export function getToolSource(toolName: string): ToolSource {
  if (toolName.startsWith(PLUGIN_TOOL_PREFIX)) {
    const parsed = parsePluginToolName(toolName);
    if (parsed) return { kind: "plugin", pluginId: parsed.pluginId, originalName: parsed.originalName };
  }
  if (toolName.startsWith(SKILL_TOOL_PREFIX)) {
    const skillName = toolName.slice(SKILL_TOOL_PREFIX.length);
    return { kind: "skill", skillName };
  }
  return { kind: "local" };
}

/**
 * Parse plugin tool name (plugin_<id>_<originalName>) into plugin id and original tool name.
 */
export function parsePluginToolName(
  prefixedName: string
): { pluginId: string; originalName: string } | null {
  if (!prefixedName.startsWith(PLUGIN_TOOL_PREFIX)) return null;
  const rest = prefixedName.slice(PLUGIN_TOOL_PREFIX.length);
  const idx = rest.indexOf("_");
  if (idx <= 0) return null;
  return {
    pluginId: rest.slice(0, idx),
    originalName: rest.slice(idx + 1),
  };
}

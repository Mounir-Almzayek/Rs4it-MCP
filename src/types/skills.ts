/**
 * Skill layer types (Phase 03).
 * Single source of truth for skill shape: name, description, inputSchema, handler.
 */

import type { ToolCallResult } from "./tools.js";

/**
 * Definition of one skill: name, description, input schema, and async handler.
 * Skills are higher-level workflows that orchestrate one or more tools.
 */
export interface SkillDefinition<TArgs = unknown> {
  /** Unique skill name (e.g. create_api_endpoint, generate_crud). */
  name: string;
  /** Human-readable description for the AI/client. */
  description: string;
  /** Schema for the skill's arguments (Zod shape for SDK registration). */
  inputSchema: Record<string, unknown>;
  /** Async handler: runs the workflow and returns a tool-style result. */
  handler: (args: TArgs) => Promise<ToolCallResult>;
}

/**
 * Prefix used when exposing skills as MCP tools so the client can distinguish them.
 * Tool name format: skill:<skill_name>
 */
export const SKILL_TOOL_PREFIX = "skill:";

/**
 * Returns the MCP tool name for a skill (e.g. skill:create_api_endpoint).
 */
export function skillToToolName(skillName: string): string {
  return `${SKILL_TOOL_PREFIX}${skillName}`;
}

/**
 * Returns the skill name from an MCP tool name, or null if not a skill tool.
 */
export function toolNameToSkillName(toolName: string): string | null {
  if (toolName.startsWith(SKILL_TOOL_PREFIX)) {
    return toolName.slice(SKILL_TOOL_PREFIX.length);
  }
  return null;
}

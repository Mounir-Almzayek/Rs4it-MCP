/**
 * Central skills registry: register skills, list for tools/list, execute for tools/call.
 */

import type { SkillDefinition } from "../types/skills.js";
import type { ToolCallResult } from "../types/tools.js";

const skills = new Map<string, SkillDefinition<unknown>>();

/**
 * Register a skill. Overwrites if the same name exists.
 */
export function registerSkill<T>(skill: SkillDefinition<T>): void {
  skills.set(skill.name, skill as SkillDefinition<unknown>);
}

/**
 * Return all registered skills (for tools/list and server registration).
 */
export function getAllSkills(): SkillDefinition<unknown>[] {
  return Array.from(skills.values());
}

/**
 * Get a skill by name, or undefined.
 */
export function getSkill(name: string): SkillDefinition<unknown> | undefined {
  return skills.get(name);
}

/**
 * Execute a skill by name with the given arguments.
 * Returns a ToolCallResult so skills can be used as tools.
 */
export async function executeSkill(
  name: string,
  args: unknown
): Promise<ToolCallResult> {
  const skill = skills.get(name);
  if (!skill) {
    return {
      content: [{ type: "text", text: `Skill not found: ${name}` }],
      isError: true,
    };
  }
  return skill.handler(args);
}

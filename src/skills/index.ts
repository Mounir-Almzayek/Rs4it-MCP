/**
 * Skill layer: registry and built-in skills (Phase 03).
 */

import {
  registerSkill,
  getAllSkills,
  getSkill,
  executeSkill,
} from "./registry.js";
import { createApiEndpointSkill } from "./create-api-endpoint.js";
import { syncCursorContentSkill } from "./sync-cursor-content.js";

/** Register all built-in skills. Call once at server startup. */
export function registerBuiltInSkills(): void {
  registerSkill(createApiEndpointSkill);
  registerSkill(syncCursorContentSkill);
}

export { registerSkill, getAllSkills, getSkill, executeSkill };
export { createApiEndpointSkill } from "./create-api-endpoint.js";
export { skillToToolName, toolNameToSkillName, SKILL_TOOL_PREFIX } from "../types/skills.js";

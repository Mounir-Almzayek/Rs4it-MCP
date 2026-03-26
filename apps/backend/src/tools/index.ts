/**
 * Tool layer: registry and built-in tools (Phase 02).
 */

import {
  registerTool,
  getAllTools,
  getTool,
  executeTool,
} from "./registry.js";
import { createFileTool } from "./create-file.js";
import { readFileTool } from "./read-file.js";
import { runCommandTool } from "./run-command.js";
import { system2030AuthRefreshTool } from "./system2030-auth-refresh.js";

/** Register all built-in tools. Call once at server startup. */
export function registerBuiltInTools(): void {
  registerTool(createFileTool);
  registerTool(readFileTool);
  registerTool(runCommandTool);
  registerTool(system2030AuthRefreshTool);
}

export { registerTool, getAllTools, getTool, executeTool };
export { createFileTool } from "./create-file.js";
export { readFileTool } from "./read-file.js";
export { runCommandTool } from "./run-command.js";
export { system2030AuthRefreshTool } from "./system2030-auth-refresh.js";

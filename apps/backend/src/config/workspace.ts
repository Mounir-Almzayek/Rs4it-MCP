/**
 * Workspace root and path safety for file tools (Phase 02).
 * All file operations must stay inside the workspace root.
 */

import path from "node:path";
import { existsSync } from "node:fs";

const DEFAULT_WORKSPACE_ROOT = process.cwd();

/**
 * Resolves workspace root from env MCP_WORKSPACE_ROOT or process.cwd().
 */
export function getWorkspaceRoot(): string {
  const env = process.env["MCP_WORKSPACE_ROOT"];
  if (env) {
    const resolved = path.resolve(env);
    if (existsSync(resolved)) return resolved;
  }
  return DEFAULT_WORKSPACE_ROOT;
}

/**
 * Resolves a user-provided path against the workspace root and ensures
 * the result stays inside the workspace (no escape via ..).
 * @throws if the resolved path is outside the workspace
 */
export function resolveWithinWorkspace(
  workspaceRoot: string,
  relativePath: string
): string {
  const normalizedRoot = path.resolve(workspaceRoot);
  const resolved = path.resolve(normalizedRoot, relativePath);
  const relative = path.relative(normalizedRoot, resolved);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Path is outside workspace: ${relativePath} (resolved: ${resolved})`
    );
  }
  return resolved;
}

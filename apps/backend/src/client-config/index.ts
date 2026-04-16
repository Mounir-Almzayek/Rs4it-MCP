/**
 * Client Config Generator orchestrator.
 */

import type { ClientType, GeneratedFile } from "./types.js";
import { collectContent } from "./content-builder.js";
import { CursorConfigGenerator } from "./generators/cursor.js";
import { ClaudeConfigGenerator } from "./generators/claude.js";
import { CopilotConfigGenerator } from "./generators/copilot.js";

const generators = {
  cursor: new CursorConfigGenerator(),
  claude: new ClaudeConfigGenerator(),
  copilot: new CopilotConfigGenerator(),
} as const;

export async function generateClientConfig(
  clientType: ClientType,
  role: string | undefined,
  workspaceRoot: string,
  options?: { dryRun?: boolean },
): Promise<GeneratedFile[]> {
  if (clientType === "unknown") return [];
  const generator = generators[clientType];
  if (!generator) return [];

  const content = await collectContent(role);
  return generator.generate(content, { workspaceRoot, dryRun: options?.dryRun });
}

export { detectClient } from "./detector.js";
export type { ClientType, GeneratedFile } from "./types.js";

/**
 * Client Config Generator types.
 */

export type ClientType = "cursor" | "claude" | "copilot" | "unknown";

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RuleInfo {
  name: string;
  description: string;
  content: string;
  globs?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  content: string;
}

export interface ContentPayload {
  hubName: string;
  hubVersion: string;
  rules: RuleInfo[];
  tools: ToolInfo[];
  skills: SkillInfo[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratorOptions {
  workspaceRoot: string;
  force?: boolean;
}

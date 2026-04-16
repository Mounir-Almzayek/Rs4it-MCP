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

export interface PromptInfo {
  name: string;
  description?: string;
  content: string;
}

export interface ResourceInfo {
  name: string;
  uri: string;
  description?: string;
  mimeType: string;
  content: string;
}

export interface SubagentInfo {
  name: string;
  description?: string;
  content: string;
  model?: string;
  readonly?: boolean;
  isBackground?: boolean;
}

export interface CommandInfo {
  name: string;
  description?: string;
  content: string;
}

export interface ContentPayload {
  hubName: string;
  hubVersion: string;
  rules: RuleInfo[];
  tools: ToolInfo[];
  skills: SkillInfo[];
  prompts: PromptInfo[];
  resources: ResourceInfo[];
  subagents: SubagentInfo[];
  commands: CommandInfo[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratorOptions {
  workspaceRoot: string;
  force?: boolean;
  /** When true, skip writing files and cleanup — just return the generated file list. */
  dryRun?: boolean;
}

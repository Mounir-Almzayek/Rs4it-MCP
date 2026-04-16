export type RegistrySource = "admin" | "mcp";

export interface DynamicToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handlerRef: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicPluginEntry {
  id: string;
  name: string;
  command: string;
  args: string[];
  description?: string;
  enabled: boolean;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicResourceEntry {
  name: string;
  uri: string;
  description?: string;
  mimeType: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicRuleEntry {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
  globs?: string;
}

export interface DynamicPromptEntry {
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicSkillEntry {
  name: string;
  description?: string;
  content: string;
  definition?: { inputSchema?: Record<string, unknown>; steps: Array<{ tool: string; args: Record<string, unknown> }> };
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicSubagentEntry {
  name: string;
  description?: string;
  content: string;
  model?: string;
  readonly?: boolean;
  isBackground?: boolean;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicCommandEntry {
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
  allowedRoles?: string[];
  source?: RegistrySource;
  origin?: string;
}

export interface DynamicRegistry {
  tools: DynamicToolEntry[];
  plugins: DynamicPluginEntry[];
  resources: DynamicResourceEntry[];
  rules: DynamicRuleEntry[];
  prompts: DynamicPromptEntry[];
  skills: DynamicSkillEntry[];
  subagents: DynamicSubagentEntry[];
  commands: DynamicCommandEntry[];
}


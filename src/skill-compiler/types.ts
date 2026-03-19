import { z } from "zod";

export const dynamicSkillStepSchema = z.object({
  type: z.enum(["tool", "plugin"]),
  target: z.string().min(1),
  argsMap: z.record(z.string(), z.string()).optional(),
});

export const dynamicSkillEntryDraftSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "name must be snake_case like my_skill"),
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  steps: z.array(dynamicSkillStepSchema).default([]),
});

export type DynamicSkillEntryDraft = z.infer<typeof dynamicSkillEntryDraftSchema>;
export type DynamicSkillStepDraft = z.infer<typeof dynamicSkillStepSchema>;

export const compileRequestSchema = z.object({
  skillText: z.string().min(1),
  /**
   * Optional hint to bias naming; compiler may still adjust.
   * Example: "create_api_endpoint"
   */
  preferredName: z.string().optional(),
  /** Optional: role id of the author/user (used by policies). */
  role: z.string().optional(),
});

/** Suggested new tool (create in Admin → Tools); handlerRef must be a built-in tool name. */
export const suggestedToolSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, "tool name must be snake_case"),
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  handlerRef: z.enum(["create_file", "read_file", "run_command"]),
});

export const compileResponseSchema = z.object({
  draft: dynamicSkillEntryDraftSchema,
  preview: z.object({
    summary: z.string().min(1),
    steps: z.array(z.string()).default([]),
  }),
  risks: z.array(z.string()).default([]),
  /** Optional: new tools the LLM suggests creating; draft steps may reference these names. */
  suggestedTools: z.array(suggestedToolSchema).optional().default([]),
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;
export type CompileResponse = z.infer<typeof compileResponseSchema>;
export type SuggestedTool = z.infer<typeof suggestedToolSchema>;

export const dryRunRequestSchema = z.object({
  draft: dynamicSkillEntryDraftSchema,
  role: z.string().optional(),
});

export const dryRunResponseSchema = z.object({
  ok: z.boolean(),
  blocked: z.array(z.object({ reason: z.string(), stepIndex: z.number().int().nonnegative().optional() })).default([]),
  warnings: z.array(z.string()).default([]),
});

export type DryRunRequest = z.infer<typeof dryRunRequestSchema>;
export type DryRunResponse = z.infer<typeof dryRunResponseSchema>;


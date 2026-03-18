import type { ToolCatalogItem } from "./tool-catalog.js";
import type { DynamicSkillEntryDraft } from "./types.js";

export type PolicyDecision = {
  blocked: Array<{ reason: string; stepIndex?: number }>;
  warnings: string[];
};

const DANGEROUS_TOOL_NAMES = new Set([
  "run_command",
]);

/**
 * Minimal hard-policy checks for compiler/dry-run.
 * This is intentionally conservative: blocks obvious unsafe steps and unknown targets.
 */
export function evaluateDraftAgainstPolicies(args: {
  draft: DynamicSkillEntryDraft;
  toolCatalog: ToolCatalogItem[];
  role?: string;
}): PolicyDecision {
  const { draft, toolCatalog, role } = args;
  const blocked: Array<{ reason: string; stepIndex?: number }> = [];
  const warnings: string[] = [];

  const toolNames = new Set(toolCatalog.map((t) => t.name));

  draft.steps.forEach((step, idx) => {
    if (!toolNames.has(step.target)) {
      blocked.push({ reason: `Unknown step target: ${step.target}`, stepIndex: idx });
      return;
    }
    if (DANGEROUS_TOOL_NAMES.has(step.target) && role !== "admin") {
      blocked.push({
        reason: `Step "${step.target}" is restricted. Use role "admin" (or change policy) to allow it.`,
        stepIndex: idx,
      });
    }
  });

  if ((draft.steps?.length ?? 0) === 0) {
    warnings.push("No steps were generated. The skill will do nothing until steps are added.");
  }

  return { blocked, warnings };
}


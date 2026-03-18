import type { ToolCallResult } from "../types/tools.js";
import { routeToolCall } from "../router.js";
import type { DynamicSkillEntryDraft } from "./types.js";

export type ExecutionTrace = {
  startedAt: string;
  finishedAt?: string;
  steps: Array<{
    index: number;
    target: string;
    ok: boolean;
    outputText: string;
    error?: string;
    startedAt: string;
    finishedAt: string;
  }>;
};

function extractText(result: ToolCallResult): string {
  return (result.content ?? [])
    .map((c) => ("text" in c ? (c.text ?? "") : ""))
    .join("");
}

export async function executeDraft(args: {
  draft: DynamicSkillEntryDraft;
  input: Record<string, unknown>;
}): Promise<{ result: ToolCallResult; trace: ExecutionTrace }> {
  const trace: ExecutionTrace = { startedAt: new Date().toISOString(), steps: [] };
  const outputs: string[] = [];

  for (let i = 0; i < args.draft.steps.length; i++) {
    const step = args.draft.steps[i];
    const startedAt = new Date().toISOString();
    try {
      const stepArgs = step.argsMap
        ? Object.fromEntries(
            Object.entries(step.argsMap).map(([k, v]) => [
              k,
              Object.prototype.hasOwnProperty.call(args.input, v) ? args.input[v] : v,
            ])
          )
        : args.input;

      const out = await routeToolCall(step.target, stepArgs as Record<string, unknown>);
      const text = extractText(out);
      outputs.push(text);
      trace.steps.push({
        index: i,
        target: step.target,
        ok: !out.isError,
        outputText: text,
        startedAt,
        finishedAt: new Date().toISOString(),
        ...(out.isError ? { error: text || "Step failed" } : {}),
      });
      if (out.isError) {
        trace.finishedAt = new Date().toISOString();
        return {
          result: {
            content: [{ type: "text", text: `Step ${i} failed: ${text || step.target}` }],
            isError: true,
          },
          trace,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      trace.steps.push({
        index: i,
        target: step.target,
        ok: false,
        outputText: "",
        error: msg,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      trace.finishedAt = new Date().toISOString();
      return {
        result: {
          content: [{ type: "text", text: `Step ${i} crashed: ${msg}` }],
          isError: true,
        },
        trace,
      };
    }
  }

  trace.finishedAt = new Date().toISOString();
  return {
    result: {
      content: [{ type: "text", text: outputs.filter(Boolean).join("\n\n") || "OK" }],
    },
    trace,
  };
}


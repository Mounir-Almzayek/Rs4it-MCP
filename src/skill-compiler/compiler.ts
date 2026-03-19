import { z } from "zod";
import type { ToolCatalogItem } from "./tool-catalog.js";
import { openRouterChat } from "./openrouter.js";
import { isEmbeddingAvailable, retrieveRelevantTools } from "./embeddings.js";
import {
  compileRequestSchema,
  compileResponseSchema,
  type CompileRequest,
  type CompileResponse,
} from "./types.js";

/** Thrown when compile fails; may include raw LLM output for debugging. */
export class CompileError extends Error {
  constructor(
    message: string,
    public readonly rawOpenRouterOutput?: string,
  ) {
    super(message);
    this.name = "CompileError";
  }
}

const modelEnv = () =>
  process.env["OPENROUTER_MODEL"] ??
  process.env["MCP_SKILL_COMPILER_MODEL"] ??
  "openai/gpt-4o-mini";

const apiKeyEnv = () =>
  process.env["OPENROUTER_API_KEY"] ?? process.env["MCP_OPENROUTER_API_KEY"];

function buildSystemPrompt(): string {
  return [
    "You are a Skill Compiler for RS4IT MCP Hub.",
    "Your job: convert a natural-language skill description into a DynamicSkillEntry draft compatible with the Hub admin registry.",
    "",
    "Output MUST be valid JSON object only (no markdown).",
    "The JSON MUST match this shape:",
    "{",
    '  "draft": { "name": "snake_case", "description": "string", "inputSchema": { ... }, "steps": [ { "type": "tool|plugin", "target": "string", "argsMap": { "argName": "inputKeyOrLiteral" } } ] },',
    '  "preview": { "summary": "string", "steps": ["human readable step", "..."] },',
    '  "risks": ["...", "..."]',
    ',  "suggestedTools": [ { "name": "snake_case", "description": "string", "inputSchema": { "paramName": { "type": "string", "description": "..." } }, "handlerRef": "create_file"|"read_file"|"run_command" } ]  // optional',
    "}",
    "",
    "Rules:",
    "- draft.name must be snake_case, short, stable.",
    "- steps[].type MUST be exactly \"tool\" or \"plugin\" (the tool/plugin name goes in \"target\" only).",
    "- steps[].target MUST be one of the provided tool names OR one of the names you put in suggestedTools.",
    "- Prefer using existing tools/skills. If the user's request needs a capability no existing tool provides, add one or more entries to suggestedTools (name, description, inputSchema, handlerRef). handlerRef must be exactly one of: create_file, read_file, run_command.",
    "- In preview.summary, mention if you suggested new tools (e.g. \"Suggested 2 new tools: x, y. Use them in Admin → Tools then apply this skill.\").",
    "- argsMap: keys are argument names; values MUST be strings (inputSchema key name or literal). No nested objects or arrays in argsMap.",
    "- Keep inputSchema minimal: only what is necessary for the steps; add type/description when clear.",
    "- If you are unsure, output fewer steps and add a risk note rather than guessing unsafe actions.",
  ].join("\n");
}

function buildUserPrompt(args: {
  req: CompileRequest;
  toolCatalog: ToolCatalogItem[];
}): string {
  const { req, toolCatalog } = args;
  const tools = toolCatalog.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: t.inputSchema ?? {},
    source: t.source,
  }));

  return [
    "Skill text:",
    req.skillText,
    "",
    req.preferredName ? `Preferred name: ${req.preferredName}` : "",
    req.role ? `Author role: ${req.role} (only tools/skills visible to this role are listed below).` : "",
    "",
    "Available tools (name/description/inputSchema):",
    JSON.stringify(tools, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
}

const jsonObjectSchema = z.record(z.string(), z.unknown());

/**
 * Normalize LLM output so it passes the strict schema without a second LLM call.
 * - steps[].type: only "tool" | "plugin" allowed → map e.g. "plugin_foo" to "plugin"
 * - steps[].argsMap: values must be string → stringify objects/arrays
 */
function normalizeCompileOutput(raw: Record<string, unknown>): Record<string, unknown> {
  const draft = raw.draft as Record<string, unknown> | undefined;
  if (!draft || typeof draft !== "object") return raw;

  const steps = Array.isArray(draft.steps) ? [...draft.steps] : [];
  const normalizedSteps = steps.map((step: unknown) => {
    if (!step || typeof step !== "object") return step;
    const s = step as Record<string, unknown>;
    let type = s.type;
    if (type !== "tool" && type !== "plugin") {
      const target = String(s.target ?? "");
      type = /plugin|plugin_/i.test(target) || (typeof type === "string" && /plugin/i.test(type)) ? "plugin" : "tool";
    }
    let argsMap = s.argsMap;
    if (argsMap != null && typeof argsMap === "object" && !Array.isArray(argsMap)) {
      const entries = Object.entries(argsMap as Record<string, unknown>);
      argsMap = Object.fromEntries(
        entries.map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
      );
    }
    return { ...s, type, argsMap };
  });

  let suggestedTools = raw.suggestedTools;
  if (Array.isArray(suggestedTools)) {
    const allowed = new Set(["create_file", "read_file", "run_command"]);
    suggestedTools = suggestedTools
      .filter((t): t is Record<string, unknown> => t && typeof t === "object" && typeof (t as Record<string, unknown>).name === "string")
      .map((t) => {
        const s = t as Record<string, unknown>;
        const ref = String(s.handlerRef ?? "create_file");
        return {
          name: String(s.name),
          description: String(s.description ?? ""),
          inputSchema: (s.inputSchema && typeof s.inputSchema === "object" && !Array.isArray(s.inputSchema)) ? s.inputSchema as Record<string, unknown> : {},
          handlerRef: allowed.has(ref) ? ref : "create_file",
        };
      });
  } else {
    suggestedTools = [];
  }

  return {
    ...raw,
    draft: { ...draft, steps: normalizedSteps },
    suggestedTools,
  };
}

async function callCompilerLLM(args: {
  req: CompileRequest;
  toolCatalog: ToolCatalogItem[];
  model: string;
  apiKey: string;
}): Promise<CompileResponse> {
  const content = await openRouterChat({
    model: args.model,
    apiKey: args.apiKey,
    system: buildSystemPrompt(),
    user: buildUserPrompt({ req: args.req, toolCatalog: args.toolCatalog }),
    temperature: 0.15,
    maxTokens: 1400,
  });

  try {
    const parsed = jsonObjectSchema.parse(JSON.parse(content)) as Record<string, unknown>;
    const normalized = normalizeCompileOutput(parsed);
    return compileResponseSchema.parse(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new CompileError(msg, content);
  }
}

async function callRepairLLM(args: {
  req: CompileRequest;
  toolCatalog: ToolCatalogItem[];
  model: string;
  apiKey: string;
  error: string;
  badJson: unknown;
}): Promise<CompileResponse> {
  const system = [
    "You are a JSON repair assistant for RS4IT skill compiler.",
    "Return ONLY valid JSON matching the required schema. No markdown.",
  ].join("\n");
  const user = [
    "The previous output failed validation.",
    `Validation error: ${args.error}`,
    "",
    "Skill text:",
    args.req.skillText,
    "",
    "Available tools:",
    JSON.stringify(args.toolCatalog, null, 2),
    "",
    "Bad output (attempt to fix it, preserving intent):",
    JSON.stringify(args.badJson, null, 2),
  ].join("\n");

  const content = await openRouterChat({
    model: args.model,
    apiKey: args.apiKey,
    system,
    user,
    temperature: 0.1,
    maxTokens: 1600,
  });

  try {
    const parsed = jsonObjectSchema.parse(JSON.parse(content)) as Record<string, unknown>;
    const normalized = normalizeCompileOutput(parsed);
    return compileResponseSchema.parse(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new CompileError(msg, content);
  }
}

const VECTOR_SEARCH_TOP_K = 30;

/**
 * Compile skill text into a draft using:
 * 1. Vector search (OpenRouter embeddings): when available, retrieves top-k tools most relevant to the skill text so the LLM sees the best context. Integrates with LangChain-style retriever pattern.
 * 2. Single LLM call (Open Router) to produce draft + preview + optional suggestedTools.
 */
export async function compileSkill(args: {
  req: unknown;
  toolCatalog: ToolCatalogItem[];
}): Promise<CompileResponse> {
  const req = compileRequestSchema.parse(args.req);
  const apiKey = apiKeyEnv();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY (or MCP_OPENROUTER_API_KEY) for skill compiler");
  }
  const model = modelEnv();

  const toolCatalogForLLM =
    isEmbeddingAvailable() && args.toolCatalog.length > VECTOR_SEARCH_TOP_K
      ? await retrieveRelevantTools(req.skillText, args.toolCatalog, { topK: VECTOR_SEARCH_TOP_K })
      : args.toolCatalog;

  try {
    return await callCompilerLLM({ req, toolCatalog: toolCatalogForLLM, model, apiKey });
  } catch (e) {
    const firstRaw = e instanceof CompileError ? e.rawOpenRouterOutput : undefined;
    // One repair attempt when schema parsing fails.
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const bad = msg.includes("JSON") ? msg : { error: msg };
      return await callRepairLLM({
        req,
        toolCatalog: args.toolCatalog,
        model,
        apiKey,
        error: msg,
        badJson: bad,
      });
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      const repairRaw = e2 instanceof CompileError ? e2.rawOpenRouterOutput : undefined;
      throw new CompileError(`Skill compiler failed: ${msg2}`, firstRaw ?? repairRaw);
    }
  }
}


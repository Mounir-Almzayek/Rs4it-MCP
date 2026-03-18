/**
 * Unified routing: determine tool source and dispatch tools/call (Phase 05).
 * Use from skill handlers to call any tool by name (local, skill, or plugin).
 */

import type { ToolCallResult } from "./types/tools.js";
import { getToolSource } from "./types/routing.js";
import { executeTool } from "./tools/index.js";
import { executeSkill } from "./skills/index.js";
import { callPluginTool } from "./plugins/index.js";

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function validateHeadersArg(args: Record<string, unknown>): ToolCallResult | null {
  if (!("headers" in args)) return null;
  const headers = args["headers"];
  if (headers === undefined) return null;
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return {
      content: [{ type: "text", text: `Invalid headers: expected an object like {"User-Agent":"..."}` }],
      isError: true,
    };
  }
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    const name = String(k ?? "").trim();
    if (!name) {
      return { content: [{ type: "text", text: "Invalid headers: empty header name" }], isError: true };
    }
    if (!HEADER_NAME_RE.test(name)) {
      return { content: [{ type: "text", text: `Invalid headers: bad header name "${name}"` }], isError: true };
    }
    if (v === null || v === undefined) {
      return { content: [{ type: "text", text: `Invalid headers: "${name}" value must be a string` }], isError: true };
    }
    if (!(typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
      return { content: [{ type: "text", text: `Invalid headers: "${name}" value must be a string` }], isError: true };
    }
  }
  return null;
}

/**
 * Route a tool call to the correct source (local, skill, plugin) and return a ToolCallResult.
 * Skills can use this to invoke tools from any source (e.g. local create_file + plugin tool).
 */
export async function routeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const headersErr = validateHeadersArg(args);
  if (headersErr) return headersErr;

  const source = getToolSource(toolName);
  switch (source.kind) {
    case "local":
      return executeTool(toolName, args);
    case "skill":
      return executeSkill(source.skillName, args);
    case "plugin": {
      const result = await callPluginTool(
        source.pluginId,
        source.originalName,
        args
      );
      return {
        content: result.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
        isError: result.isError,
      };
    }
  }
}

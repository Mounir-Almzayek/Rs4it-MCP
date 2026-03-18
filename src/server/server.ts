/**
 * MCP Server layer (Phase 01 + 02 + 03 + 05 + 08 + 09).
 * Builds the McpServer with serverInfo, capabilities, and merged tools (local + skills + plugins + dynamic).
 * Optional role filters tools/list by allowedRoles (with role inheritance).
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SERVER_NAME,
  SERVER_VERSION,
  DEFAULT_CAPABILITIES,
} from "../config/constants.js";
import {
  registerBuiltInTools,
  getAllTools,
  executeTool,
} from "../tools/index.js";
import {
  registerBuiltInSkills,
  getAllSkills,
  executeSkill,
  skillToToolName,
} from "../skills/index.js";
import { getLoadedPlugins, callPluginTool, getPluginPrompt, readPluginResource } from "../plugins/index.js";
import { registerBuiltInPrompts } from "../prompts/index.js";
import { registerBuiltInResources } from "../resources/index.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { isAllowedForRole } from "../config/roles.js";
import { PLUGIN_TOOL_PREFIX, PLUGIN_SKILL_PREFIX, PLUGIN_PROMPT_PREFIX, PLUGIN_RESOURCE_URI_SCHEME } from "../plugins/constants.js";
import type {
  DynamicSkillStep,
  DynamicPromptEntry,
  DynamicResourceEntry,
} from "../types/dynamic-registry.js";

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function headersValidationError(args: unknown): { isError: true; message: string } | null {
  if (!args || typeof args !== "object") return null;
  if (!("headers" in (args as Record<string, unknown>))) return null;
  const headers = (args as Record<string, unknown>)["headers"];
  if (headers === undefined) return null;
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return { isError: true, message: `Invalid headers: expected an object like {"User-Agent":"..."}` };
  }
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    const name = String(k ?? "").trim();
    if (!name) return { isError: true, message: "Invalid headers: empty header name" };
    if (!HEADER_NAME_RE.test(name)) return { isError: true, message: `Invalid headers: bad header name "${name}"` };
    if (v === null || v === undefined) return { isError: true, message: `Invalid headers: "${name}" value must be a string` };
    if (!(typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
      return { isError: true, message: `Invalid headers: "${name}" value must be a string` };
    }
  }
  return null;
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export interface CreateServerOptions {
  /** When set, only tools/skills/plugins allowed for this role (and inherited roles) are registered. */
  role?: string;
  /** Called after each tool/skill/plugin invocation (Phase 12). HTTP layer passes a callback that includes user. */
  onToolInvoked?: (toolName: string) => void;
  /** Base URL of the Hub (e.g. http://localhost:3000). When set, serverInfo includes icon URL for Cursor/IDE. */
  baseUrl?: string;
}

const toolResultCast = (r: Awaited<ReturnType<typeof executeTool>>) =>
  r as Awaited<ReturnType<Parameters<McpServer["registerTool"]>[2]>>;

/**
 * Normalize inputSchema: dashboard stores flat { paramName: { type, description? } };
 * we need full JSON Schema { type: "object", properties, required }.
 */
function normalizeInputSchemaToMcp(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const hasObjectType = schema["type"] === "object";
  const hasProperties = "properties" in schema && schema["properties"] != null;
  if (hasObjectType && hasProperties) return schema;
  const properties = hasProperties ? (schema["properties"] as Record<string, unknown>) : schema;
  const required = Object.keys(properties).filter(
    (k) => (properties[k] as Record<string, unknown>)?.type != null
  );
  return {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
  };
}

/**
 * Build a Zod schema from normalized JSON Schema so the MCP SDK can serialize it correctly.
 * The SDK expects Zod and converts it to JSON Schema for tools/list; plain objects may be dropped.
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const normalized = normalizeInputSchemaToMcp(schema);
  const props = (normalized["properties"] as Record<string, unknown>) ?? {};
  const required = new Set((normalized["required"] as string[]) ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, def] of Object.entries(props)) {
    const d = (def ?? {}) as Record<string, unknown>;
    const type = String(d["type"] ?? "string");
    const desc = typeof d["description"] === "string" ? d["description"] : undefined;
    const hasDefault = typeof d === "object" && d !== null && "default" in d && d["default"] !== undefined;
    const isRequired = required.has(key) && !hasDefault;
    let field: z.ZodTypeAny;
    if (type === "string") field = z.string();
    else if (type === "number") field = z.number();
    else if (type === "integer") field = z.number().int();
    else if (type === "boolean") field = z.boolean();
    else if (type === "array") field = z.array(z.unknown());
    else field = z.string();
    if (desc) field = field.describe(desc);
    if (!isRequired || hasDefault) {
      field = field.optional();
      if (hasDefault) field = (field as z.ZodOptional<z.ZodTypeAny>).default(d["default"]);
    }
    shape[key] = field;
  }
  return z.object(shape);
}

async function runDynamicSkillSteps(
  steps: DynamicSkillStep[],
  args: Record<string, unknown>
): Promise<Awaited<ReturnType<typeof executeTool>>> {
  const results: string[] = [];
  for (const step of steps) {
    const stepArgs = step.argsMap
      ? Object.fromEntries(
          Object.entries(step.argsMap).map(([k, v]) => [k, args[v] ?? v])
        )
      : args;
    if (step.type === "tool") {
      const out = await executeTool(step.target, stepArgs);
      results.push(
        out.content.map((c) => ("text" in c ? c.text : "")).join("")
      );
    } else {
      const prefix = step.target.startsWith(PLUGIN_SKILL_PREFIX)
        ? PLUGIN_SKILL_PREFIX
        : step.target.startsWith(PLUGIN_TOOL_PREFIX)
          ? PLUGIN_TOOL_PREFIX
          : null;
      const match = prefix
        ? step.target.slice(prefix.length).split("_")
        : [];
      if (match.length >= 2) {
        const [pluginId, ...rest] = match;
        const originalName = rest.join("_");
        const out = await callPluginTool(
          pluginId,
          originalName,
          stepArgs as Record<string, unknown>
        );
        results.push(
          out.content.map((c) => c.text ?? "").join("")
        );
      }
    }
  }
  return {
    content: [{ type: "text" as const, text: results.join("\n\n") }],
    isError: false,
  };
}

/**
 * Creates and configures the MCP server: initialize, unified tools/list (local + skills + plugins + dynamic), tools/call routed by name.
 * If options.role is set, only entities allowed for that role (and inherited roles) are registered.
 */
export async function createServer(options?: CreateServerOptions): Promise<McpServer> {
  const role = options?.role;
  const onToolInvoked = options?.onToolInvoked;
  const baseUrl = options?.baseUrl;
  registerBuiltInTools();
  registerBuiltInSkills();

  const serverInfo: { name: string; version: string; icon?: { src: string; mimeType: string; sizes?: string[] } } = {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
  if (baseUrl) {
    serverInfo.icon = {
      src: `${baseUrl.replace(/\/$/, "")}/logo`,
      mimeType: "image/webp",
      sizes: ["48x48"],
    };
  }
  const server = new McpServer(
    serverInfo as { name: string; version: string },
    { capabilities: DEFAULT_CAPABILITIES }
  );

  // Built-in prompts and resources so prompts/list and resources/list are implemented (fixes MCP -32601 Method not found)
  registerBuiltInPrompts(server);
  registerBuiltInResources(server);

  // Built-in tools: no allowedRoles → visible to all
  for (const tool of getAllTools()) {
    const name = tool.name;
    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        onToolInvoked?.(name);
        return toolResultCast(await executeTool(name, args));
      }
    );
  }

  // Built-in skills: visible to all
  for (const skill of getAllSkills()) {
    const toolName = skillToToolName(skill.name);
    server.registerTool(
      toolName,
      {
        description: `[Skill] ${skill.description}`,
        inputSchema: skill.inputSchema as Record<string, unknown>,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        onToolInvoked?.(toolName);
        return toolResultCast(await executeSkill(skill.name, args));
      }
    );
  }

  const dynamic = await loadDynamicRegistry();

  for (const entry of dynamic.tools) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const handlerRef = entry.handlerRef;
    const toolName = entry.name;
    server.registerTool(
      toolName,
      {
        description: entry.description,
        inputSchema: jsonSchemaToZod((entry.inputSchema ?? {}) as Record<string, unknown>),
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        onToolInvoked?.(toolName);
        return toolResultCast(await executeTool(handlerRef, args));
      }
    );
  }
  for (const entry of dynamic.skills) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const steps = entry.steps ?? [];
    const toolName = skillToToolName(entry.name);
    server.registerTool(
      toolName,
      {
        description: `[Skill] ${entry.description}`,
        inputSchema: jsonSchemaToZod((entry.inputSchema ?? {}) as Record<string, unknown>),
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        onToolInvoked?.(toolName);
        const result = await runDynamicSkillSteps(
          steps,
          (args as Record<string, unknown>) ?? {}
        );
        return toolResultCast(result);
      }
    );
  }

  const pluginAllowedMap = new Map<string, string[]>();
  for (const p of dynamic.plugins) {
    if (p.allowedRoles && p.allowedRoles.length > 0) {
      pluginAllowedMap.set(p.id, p.allowedRoles);
    }
  }

  for (const plugin of getLoadedPlugins()) {
    if (role) {
      const allowed = pluginAllowedMap.get(plugin.id);
      if (allowed !== undefined && !(await isAllowedForRole(allowed, role))) continue;
    }
    for (const pt of plugin.tools) {
      const pluginId = plugin.id;
      const originalName = pt.originalName;
      const toolName = pt.name;
      server.registerTool(
        toolName,
        {
          description: pt.description ?? `[Plugin ${plugin.name}] ${pt.originalName}`,
          inputSchema: jsonSchemaToZod((pt.inputSchema ?? {}) as Record<string, unknown>),
        } as Parameters<McpServer["registerTool"]>[1],
        async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
          onToolInvoked?.(toolName);
          const result = await callPluginTool(pluginId, originalName, args as Record<string, unknown>);
          return toolResultCast({
            content: result.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
            isError: result.isError,
          });
        }
      );
    }
    for (const ps of plugin.skills) {
      const pluginId = plugin.id;
      const originalName = ps.originalName;
      const toolName = ps.name;
      server.registerTool(
        toolName,
        {
          description: ps.description ?? `[Skill][Plugin ${plugin.name}] ${ps.originalName}`,
          inputSchema: jsonSchemaToZod((ps.inputSchema ?? {}) as Record<string, unknown>),
        } as Parameters<McpServer["registerTool"]>[1],
        async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
          onToolInvoked?.(toolName);
          const result = await callPluginTool(pluginId, originalName, args as Record<string, unknown>);
          return toolResultCast({
            content: result.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
            isError: result.isError,
          });
        }
      );
    }
  }

  for (const plugin of getLoadedPlugins()) {
    if (role) {
      const allowed = pluginAllowedMap.get(plugin.id);
      if (allowed !== undefined && !(await isAllowedForRole(allowed, role))) continue;
    }
    for (const pp of plugin.prompts) {
      const pluginId = plugin.id;
      const originalName = pp.originalName;
      const promptName = pp.name;
      const argsSchema =
        pp.arguments && pp.arguments.length > 0
          ? Object.fromEntries(
              pp.arguments.map((a) => [
                a.name,
                z.string().describe(a.description ?? a.name).optional(),
              ])
            )
          : undefined;
      server.registerPrompt(
        promptName,
        {
          title: pp.originalName,
          description: pp.description ?? `[Plugin ${plugin.name}] ${pp.originalName}`,
          argsSchema,
        },
        async (args: Record<string, unknown> | undefined) => {
          const result = await getPluginPrompt(pluginId, originalName, args);
          const messages = result.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: { type: "text" as const, text: m.content?.text ?? "" },
          }));
          return { messages };
        }
      );
    }
  }

  for (const plugin of getLoadedPlugins()) {
    if (role) {
      const allowed = pluginAllowedMap.get(plugin.id);
      if (allowed !== undefined && !(await isAllowedForRole(allowed, role))) continue;
    }
    for (const res of plugin.resources) {
      const pluginId = plugin.id;
      const originalUri = res.originalUri;
      const uri = res.uri;
      server.registerResource(
        res.name,
        uri,
        {
          title: res.originalName,
          description: res.description ?? `[Plugin ${plugin.name}] ${res.originalName}`,
        },
        async () => {
          const result = await readPluginResource(pluginId, originalUri);
          return {
            contents: result.contents.map((c) => ({
              uri: c.uri,
              mimeType: c.mimeType,
              text: c.text ?? "",
            })),
          };
        }
      );
    }
  }

  for (const entry of dynamic.prompts) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const template = entry.template;
    const argsSchema =
      entry.argsSchema && Object.keys(entry.argsSchema as object).length > 0
        ? jsonSchemaToZod(entry.argsSchema as Record<string, unknown>).shape
        : undefined;
    server.registerPrompt(
      entry.name,
      {
        title: entry.title ?? entry.name,
        description: entry.description,
        argsSchema,
      },
      (args: Record<string, unknown> | undefined, _extra) => {
        let text = template;
        if (args && typeof args === "object") {
          for (const [k, v] of Object.entries(args)) {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v ?? ""));
          }
        }
        return Promise.resolve({
          messages: [
            { role: "user" as const, content: { type: "text" as const, text } },
          ],
        });
      }
    );
  }

  for (const entry of dynamic.resources) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const uri = entry.uri;
    const mimeType = entry.mimeType;
    const content = entry.content;
    server.registerResource(
      entry.name,
      uri,
      {
        title: entry.name,
        description: entry.description ?? undefined,
      },
      async () => ({
        contents: [{ uri, mimeType, text: content }],
      })
    );
  }

  return server;
}

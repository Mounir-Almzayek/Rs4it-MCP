/**
 * MCP client for a single plugin process (Phase 04).
 * Connects via stdio, runs initialize, and exposes listTools / listPrompts / listResources and call/get/read.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  PluginConfig,
  PluginTool,
  PluginToolCallResult,
  PluginSkillRef,
  PluginPromptRef,
  PluginResourceRef,
} from "./types.js";
import { PLUGIN_TOOL_PREFIX, PLUGIN_PROMPT_PREFIX, PLUGIN_RESOURCE_URI_SCHEME, PLUGIN_SKILL_PREFIX } from "./constants.js";

export interface PluginClientResult {
  tools: PluginTool[];
  skills: PluginSkillRef[];
  prompts: PluginPromptRef[];
  resources: PluginResourceRef[];
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<PluginToolCallResult>;
  getPrompt: (name: string, args?: Record<string, unknown>) => Promise<{ messages: Array<{ role: string; content: { type: string; text?: string } }> }>;
  readResource: (uri: string) => Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>;
  close: () => Promise<void>;
}

export type CreatePluginClientResult =
  | { ok: true; tools: PluginTool[]; skills: PluginSkillRef[]; prompts: PluginPromptRef[]; resources: PluginResourceRef[]; callTool: PluginClientResult["callTool"]; getPrompt: PluginClientResult["getPrompt"]; readResource: PluginClientResult["readResource"]; close: () => Promise<void> }
  | { ok: false; error: string };

/**
 * Start plugin process, connect as MCP client, fetch tools.
 * Tools are returned with prefixed names (plugin:<id>:<name>).
 * Returns { ok: true, ... } on success or { ok: false, error } on failure (for connection status).
 */
export async function createPluginClient(
  config: PluginConfig
): Promise<CreatePluginClientResult> {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    env: config.env,
    stderr: "pipe",
  });

  const client = new Client(
    { name: "rs4it-mcp-hub-plugin-client", version: "0.1.0" },
    { capabilities: {} }
  );

  const initTimeout = config.timeout ?? 30_000;
  try {
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Plugin init timeout")), initTimeout)
      ),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[rs4it-mcp] Plugin ${config.id} failed to connect:`, err);
    try {
      await transport.close();
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }

  let tools: PluginTool[] = [];
  try {
    const result = await client.listTools();
    tools = (result.tools ?? []).map((t) => ({
      name: `${PLUGIN_TOOL_PREFIX}${config.id}:${t.name}`,
      originalName: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[rs4it-mcp] Plugin ${config.id} listTools failed:`, err);
    try {
      await transport.close();
    } catch {
      // ignore
    }
    return { ok: false, error: `listTools: ${message}` };
  }

  let skills: PluginSkillRef[] = [];
  let prompts: PluginPromptRef[] = [];
  let resources: PluginResourceRef[] = [];
  const clientAny = client as unknown as {
    listSkills?: () => Promise<{ skills?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> }>;
    listPrompts?: () => Promise<{ prompts?: Array<{ name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }> }>;
    listResources?: () => Promise<{ resources?: Array<{ uri: string; name?: string; description?: string; mimeType?: string }> }>;
    getPrompt?: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<{ messages?: Array<{ role: string; content?: { type: string; text?: string } }> }>;
    readResource?: (params: { uri: string }) => Promise<{ contents?: Array<{ uri: string; mimeType?: string; text?: string }> }>;
  };
  try {
    if (typeof clientAny.listSkills === "function") {
      const sk = await clientAny.listSkills();
      skills = (sk.skills ?? []).map((s) => ({
        name: `${PLUGIN_SKILL_PREFIX}${config.id}:${s.name}`,
        originalName: s.name,
        description: s.description,
        inputSchema: s.inputSchema,
      }));
    }
  } catch (err) {
    console.warn(`[rs4it-mcp] Plugin ${config.id} listSkills failed (skipping):`, err);
  }
  try {
    if (typeof clientAny.listPrompts === "function") {
      const pr = await clientAny.listPrompts();
      prompts = (pr.prompts ?? []).map((p) => ({
        name: `${PLUGIN_PROMPT_PREFIX}${config.id}:${p.name}`,
        originalName: p.name,
        description: p.description,
        arguments: p.arguments,
      }));
    }
  } catch (err) {
    console.warn(`[rs4it-mcp] Plugin ${config.id} listPrompts failed (skipping):`, err);
  }
  try {
    if (typeof clientAny.listResources === "function") {
      const res = await clientAny.listResources();
      resources = (res.resources ?? []).map((r) => {
        const origUri = r.uri;
        const slug = r.name ?? origUri;
        return {
          name: `${PLUGIN_PROMPT_PREFIX}${config.id}:${slug}`,
          originalName: slug,
          uri: `${PLUGIN_RESOURCE_URI_SCHEME}://${config.id}/${encodeURIComponent(origUri)}`,
          originalUri: origUri,
          description: r.description,
          mimeType: r.mimeType,
        };
      });
    }
  } catch (err) {
    console.warn(`[rs4it-mcp] Plugin ${config.id} listResources failed (skipping):`, err);
  }

  async function callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<PluginToolCallResult> {
    try {
      const result = await client.callTool({ name: toolName, arguments: args });
      const content = Array.isArray(result.content) ? result.content : [];
      return {
        content: content.map((c) =>
          typeof c === "object" && c && "type" in c && "text" in c
            ? { type: (c as { type: string }).type, text: (c as { text: string }).text }
            : { type: "text", text: String(c) }
        ),
        isError: (result as { isError?: boolean }).isError,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Plugin tool error: ${message}` }],
        isError: true,
      };
    }
  }

  async function getPrompt(
    name: string,
    args?: Record<string, unknown>
  ): Promise<{ messages: Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }> }> {
    if (typeof clientAny.getPrompt !== "function") {
      return { messages: [{ role: "user", content: { type: "text", text: "Plugin does not support getPrompt" } }] };
    }
    try {
      const out = await clientAny.getPrompt({ name, arguments: args });
      const messages = (out.messages ?? []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: typeof m.content === "object" && m.content && "type" in m.content
          ? { type: "text" as const, text: String((m.content as { text?: string }).text ?? "") }
          : { type: "text" as const, text: String(m.content ?? "") },
      }));
      return { messages };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { messages: [{ role: "user", content: { type: "text", text: `Plugin prompt error: ${message}` } }] };
    }
  }

  async function readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }> {
    if (typeof clientAny.readResource !== "function") {
      return { contents: [{ uri, text: "Plugin does not support readResource" }] };
    }
    try {
      const out = await clientAny.readResource({ uri });
      return {
        contents: (out.contents ?? []).map((c) => ({
          uri: c.uri,
          mimeType: c.mimeType,
          text: c.text ?? "",
        })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { contents: [{ uri, text: `Plugin resource error: ${message}` }] };
    }
  }

  return {
    ok: true as const,
    tools,
    skills,
    prompts,
    resources,
    callTool,
    getPrompt,
    readResource,
    close: () => transport.close(),
  };
}

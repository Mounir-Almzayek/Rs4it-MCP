/**
 * MCP client for a single plugin process (Phase 04).
 * Connects via stdio, runs initialize, and exposes listTools / listResources and call/read.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  PluginConfig,
  PluginTool,
  PluginToolCallResult,
  PluginResourceRef,
  PluginPromptRef,
} from "./types.js";
import { PLUGIN_TOOL_PREFIX, PLUGIN_RESOURCE_URI_SCHEME } from "./constants.js";

export interface PluginClientResult {
  tools: PluginTool[];
  resources: PluginResourceRef[];
  prompts: PluginPromptRef[];
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<PluginToolCallResult>;
  readResource: (uri: string) => Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>;
  readPrompt: (name: string) => Promise<{ description?: string; content: string }>;
  close: () => Promise<void>;
}

export type CreatePluginClientResult =
  | { ok: true; tools: PluginTool[]; resources: PluginResourceRef[]; prompts: PluginPromptRef[]; callTool: PluginClientResult["callTool"]; readResource: PluginClientResult["readResource"]; readPrompt: PluginClientResult["readPrompt"]; close: () => Promise<void> }
  | { ok: false; error: string };

/**
 * Start plugin process, connect as MCP client, fetch tools.
 * Tools are returned with prefixed names (plugin:<id>:<name>).
 * Returns { ok: true, ... } on success or { ok: false, error } on failure (for connection status).
 */
export async function createPluginClient(
  config: PluginConfig
): Promise<CreatePluginClientResult> {
  function safeSegment(input: string): string {
    const s = String(input ?? "").trim();
    // Normalize to underscore-separated identifier segments.
    // Examples:
    // - "next:docs/readme" -> "next_docs_readme"
    // - "user-journey test" -> "user_journey_test"
    return s
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
  }

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
      // plugin_<pluginId>_<toolName>
      name: `${PLUGIN_TOOL_PREFIX}${config.id}_${t.name}`,
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

  let resources: PluginResourceRef[] = [];
  const clientAny = client as unknown as {
    listResources?: () => Promise<{ resources?: Array<{ uri: string; name?: string; description?: string; mimeType?: string }> }>;
    readResource?: (params: { uri: string }) => Promise<{ contents?: Array<{ uri: string; mimeType?: string; text?: string }> }>;
    listPrompts?: () => Promise<{ prompts?: Array<{ name: string; description?: string }> }>;
    getPrompt?: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<{ description?: string; messages?: Array<{ content?: unknown }> }>;
  };
  try {
    if (typeof clientAny.listResources === "function") {
      const res = await clientAny.listResources();
      resources = (res.resources ?? []).map((r) => {
        const origUri = r.uri;
        const slug = safeSegment(r.name ?? origUri);
        return {
          // plugin_res_<pluginId>_<resourceSlug>
          name: `plugin_res_${safeSegment(config.id)}_${slug}`,
          originalName: r.name ?? origUri,
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

  let prompts: PluginPromptRef[] = [];
  try {
    if (typeof clientAny.listPrompts === "function") {
      const res = await clientAny.listPrompts();
      prompts = (res.prompts ?? []).map((p) => ({
        name: `plugin_prompt_${safeSegment(config.id)}_${safeSegment(p.name)}`,
        originalName: p.name,
        description: p.description,
      }));
    }
  } catch (err) {
    console.warn(`[rs4it-mcp] Plugin ${config.id} listPrompts failed (skipping):`, err);
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

  async function readPrompt(name: string): Promise<{ description?: string; content: string }> {
    if (typeof clientAny.getPrompt !== "function") {
      return { content: "" };
    }
    try {
      const out = await clientAny.getPrompt({ name, arguments: {} });
      const parts = Array.isArray(out.messages) ? out.messages : [];
      const text = parts
        .map((m) => {
          const c = (m as { content?: unknown }).content;
          if (typeof c === "string") return c;
          if (Array.isArray(c)) {
            return c
              .map((x) => (x && typeof x === "object" && "text" in (x as Record<string, unknown>) ? String((x as Record<string, unknown>)["text"] ?? "") : String(x ?? "")))
              .join("\n");
          }
          if (c && typeof c === "object" && "text" in (c as Record<string, unknown>)) {
            return String((c as Record<string, unknown>)["text"] ?? "");
          }
          return "";
        })
        .filter(Boolean)
        .join("\n\n")
        .trim();
      return { description: out.description, content: text };
    } catch {
      return { content: "" };
    }
  }

  return {
    ok: true as const,
    tools,
    resources,
    prompts,
    callTool,
    readResource,
    readPrompt,
    close: () => transport.close(),
  };
}

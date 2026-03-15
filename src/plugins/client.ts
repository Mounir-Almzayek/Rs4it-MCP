/**
 * MCP client for a single plugin process (Phase 04).
 * Connects via stdio, runs initialize, and exposes listTools / callTool.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { PluginConfig, PluginTool, PluginToolCallResult } from "./types.js";
import { PLUGIN_TOOL_PREFIX } from "./constants.js";

export interface PluginClientResult {
  tools: PluginTool[];
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<PluginToolCallResult>;
  close: () => Promise<void>;
}

export type CreatePluginClientResult =
  | { ok: true; tools: PluginTool[]; callTool: PluginClientResult["callTool"]; close: () => Promise<void> }
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

  return {
    ok: true as const,
    tools,
    callTool,
    close: () => transport.close(),
  };
}

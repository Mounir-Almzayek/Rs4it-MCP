/**
 * sync_client_config tool: manually generate client config files.
 */

import { z } from "zod";
import type { RegisteredTool, ToolCallResult } from "../types/tools.js";
import { getWorkspaceRoot } from "../config/workspace.js";
import { generateClientConfig } from "../client-config/index.js";
import type { ClientType } from "../client-config/types.js";

export const SYNC_CLIENT_CONFIG_NAME = "sync_client_config" as const;

const inputSchema = {
  clientType: z
    .enum(["cursor", "claude", "copilot"])
    .optional()
    .describe("Target client type. If omitted, uses the detected client from the current session."),
  force: z
    .boolean()
    .optional()
    .default(true)
    .describe("Write all files even if unchanged."),
};

export type SyncClientConfigArgs = z.infer<z.ZodObject<typeof inputSchema>>;

/** Set by http-entry when a session is created. Fallback for when clientType is not provided. */
let sessionClientType: ClientType = "unknown";
let sessionRole: string | undefined;

export function setSessionContext(clientType: ClientType, role?: string): void {
  sessionClientType = clientType;
  sessionRole = role;
}

async function handler(args: SyncClientConfigArgs): Promise<ToolCallResult> {
  try {
    const clientType = (args.clientType ?? sessionClientType) as ClientType;
    if (clientType === "unknown") {
      return {
        content: [{ type: "text", text: "Cannot determine client type. Pass clientType parameter (cursor, claude, or copilot)." }],
        isError: true,
      };
    }
    const root = getWorkspaceRoot();
    const files = await generateClientConfig(clientType, sessionRole, root);
    const fileList = files.map((f) => f.path).join("\n");
    return {
      content: [{ type: "text", text: `Generated ${files.length} config files for ${clientType}:\n${fileList}` }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

export const syncClientConfigTool: RegisteredTool<SyncClientConfigArgs> = {
  name: SYNC_CLIENT_CONFIG_NAME,
  description:
    "Generate IDE config files (.cursor/rules/, .claude/, .github/) with Hub rules, tools, and skills. Runs automatically on connect, or call manually to refresh.",
  inputSchema,
  handler,
};

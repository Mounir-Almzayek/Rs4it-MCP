/**
 * Built-in prompts (Phase 13).
 * Registers Hub prompts on the McpServer so clients see them in prompts/list.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  HUB_HELP_PROMPT_NAME,
  hubHelpPromptConfig,
  getHubHelpPromptHandler,
} from "./hub-help.js";

export function registerBuiltInPrompts(server: McpServer): void {
  server.registerPrompt(
    HUB_HELP_PROMPT_NAME,
    {
      title: hubHelpPromptConfig.title,
      description: hubHelpPromptConfig.description,
      argsSchema: hubHelpPromptConfig.argsSchema,
    },
    getHubHelpPromptHandler()
  );
}

/**
 * Built-in prompt: hub_help — instructions for using the RS4IT MCP Hub.
 * Phase 13.
 */

import { z } from "zod";

export const HUB_HELP_PROMPT_NAME = "hub_help" as const;

const argsSchema = {
  topic: z
    .string()
    .optional()
    .describe("Optional topic: 'tools' | 'skills' | 'plugins' | omit for full help"),
};

export type HubHelpArgs = z.infer<z.ZodObject<typeof argsSchema>>;

function buildHelpText(topic?: string): string {
  const full = `# RS4IT MCP Hub — Quick reference

- **Tools**: Built-in \`create_file\`, \`read_file\`, \`run_command\` plus any dynamic tools from the admin panel. Call via \`tools/call\` with the tool name and arguments.
- **Skills**: Workflows exposed as tools with names \`skill:<name>\` (e.g. \`skill:create_api_endpoint\`). They run one or more tools in sequence. Add skills from Admin → Skills.
- **Plugins**: External MCP servers loaded via config; their tools appear as \`plugin:<id>:<tool_name>\`. Configure in \`config/mcp_plugins.json\` or Admin → Plugins.
- **Roles**: Send \`X-MCP-Role\` (HTTP) or set \`MCP_ROLE\` (stdio) to filter which tools/skills/plugins are visible. Define roles in Admin → Roles.
- **Usage**: Send \`X-MCP-User-Name\` so the admin panel can show who last used the Hub and invocation counts (Admin → Usage).`;

  if (topic === "tools") {
    return `# Hub — Tools

Use \`tools/list\` to see available tools. Built-in: \`create_file\`, \`read_file\`, \`run_command\`. Dynamic tools (custom name + description) are added from Admin → Tools and still run one of these handlers. Call any tool with \`tools/call\` and the correct arguments (e.g. \`path\`, \`content\` for create_file).`;
  }
  if (topic === "skills") {
    return `# Hub — Skills

Skills are workflows that run one or more tools in order. They appear in \`tools/list\` as \`skill:<name>\` (e.g. \`skill:create_api_endpoint\`). Add or edit skills in Admin → Skills: define steps (each step is a tool or plugin tool) and an input schema. When the client calls the skill, the Hub runs each step with the same arguments; each step uses the parameters it needs.`;
  }
  if (topic === "plugins") {
    return `# Hub — Plugins

External MCP servers are configured in \`config/mcp_plugins.json\` (or Admin → Plugins). Each plugin runs as a subprocess (e.g. npx). Its tools are exposed with the prefix \`plugin:<id>:<tool_name>\`. The Hub aggregates them in \`tools/list\` and routes \`tools/call\` to the correct plugin.`;
  }
  return full;
}

export function getHubHelpPromptHandler() {
  return (args: HubHelpArgs) => {
    const text = buildHelpText(args.topic);
    return Promise.resolve({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text },
        },
      ],
    });
  };
}

export const hubHelpPromptConfig = {
  title: "RS4IT Hub help",
  description: "Get instructions and quick reference for using the RS4IT MCP Hub: tools, skills, plugins, and roles. Optionally pass topic: 'tools' | 'skills' | 'plugins' for a shorter section.",
  argsSchema,
} as const;

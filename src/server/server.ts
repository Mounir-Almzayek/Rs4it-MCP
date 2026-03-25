/**
 * MCP Server layer (Phase 01 + 02 + 03 + 05 + 08 + 09).
 * Builds the McpServer with serverInfo, capabilities, and merged tools (local + skills + plugins + dynamic).
 * Optional role filters tools/list by allowedRoles (with role inheritance).
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
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
import { loadDynamicRegistry, writeDynamicRegistry } from "../config/dynamic-config.js";
import { isAllowedForRole, loadRoleConfig, validateAllowedRoles, writeRoleConfig } from "../config/roles.js";
import { PLUGIN_TOOL_PREFIX, PLUGIN_SKILL_PREFIX, PLUGIN_PROMPT_PREFIX, PLUGIN_RESOURCE_URI_SCHEME } from "../plugins/constants.js";
import type { DynamicPromptEntry, DynamicResourceEntry } from "../types/dynamic-registry.js";

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
 * Convert a single property value from Zod-internal shape to JSON Schema.
 * Handles stored schema that was serialized from Zod (_def.typeName, _def.description).
 */
function normalizePropertyToJsonSchema(prop: unknown): Record<string, unknown> {
  if (!prop || typeof prop !== "object") return { type: "string" };
  const p = prop as Record<string, unknown>;
  const def = p["_def"] as Record<string, unknown> | undefined;
  if (def && typeof def === "object") {
    const typeName = String(def["typeName"] ?? "ZodString");
    const description = typeof def["description"] === "string" ? def["description"] : undefined;
    const type =
      typeName === "ZodNumber" ? "number"
      : typeName === "ZodBoolean" ? "boolean"
      : typeName === "ZodArray" ? "array"
      : "string";
    return description ? { type, description } : { type };
  }
  if (typeof p["type"] === "string") {
    return {
      type: p["type"],
      ...(typeof p["description"] === "string" && { description: p["description"] }),
    };
  }
  return { type: "string" };
}

/**
 * Normalize inputSchema: dashboard stores flat { paramName: { type, description? } };
 * or Zod-serialized { paramName: { _def: { typeName, description } } };
 * we need full JSON Schema { type: "object", properties, required }.
 */
function normalizeInputSchemaToMcp(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const hasObjectType = schema["type"] === "object";
  const hasProperties = "properties" in schema && schema["properties"] != null;
  if (hasObjectType && hasProperties) {
    const props = schema["properties"] as Record<string, unknown>;
    const normalizedProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props ?? {})) {
      normalizedProps[k] = normalizePropertyToJsonSchema(v);
    }
    return { ...schema, properties: normalizedProps };
  }
  const rawProperties = hasProperties ? (schema["properties"] as Record<string, unknown>) : schema;
  const properties: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawProperties ?? {})) {
    properties[k] = normalizePropertyToJsonSchema(v);
  }
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

  // MCP admin tools (Phase 02): only visible when role is admin.
  // These tools mutate config files (dynamic-registry.json / roles.json) and are intended for Cursor chat authoring.
  if (role === "admin") {
    const exportCursorPluginSchema = z.object({
      pluginName: z
        .string()
        .min(1)
        .regex(/^[a-z0-9][a-z0-9-_]*$/, "pluginName must be kebab-case like rs4it-hub"),
      description: z.string().optional(),
      version: z.string().optional().default("0.1.0"),
      authorName: z.string().optional().default("RS4IT"),
      outputDir: z
        .string()
        .optional()
        .describe("Optional absolute output directory. If omitted, uses MCP_CURSOR_PLUGIN_EXPORT_DIR or ./exports/cursor-plugins"),
      overwrite: z.boolean().optional().default(true),
      includeSkills: z.boolean().optional().default(true),
      includeRules: z.boolean().optional().default(true),
    });
    server.registerTool(
      "admin_export_cursor_plugin",
      {
        description:
          "Export registry skills/rules as a Cursor plugin folder you can install under ~/.cursor/plugins/local (admin-only).",
        inputSchema: exportCursorPluginSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = exportCursorPluginSchema.parse(args);

        const reg = await loadDynamicRegistry();
        const baseOut =
          parsed.outputDir?.trim() ||
          process.env["MCP_CURSOR_PLUGIN_EXPORT_DIR"] ||
          path.resolve(process.cwd(), "exports", "cursor-plugins");
        const outDir = path.resolve(baseOut, parsed.pluginName);

        if (parsed.overwrite) {
          await rm(outDir, { recursive: true, force: true });
        }
        await mkdir(outDir, { recursive: true });

        // Manifest
        await mkdir(path.join(outDir, ".cursor-plugin"), { recursive: true });
        const manifest = {
          name: parsed.pluginName,
          description: parsed.description ?? "Exported from RS4IT Hub registry",
          version: parsed.version,
          author: { name: parsed.authorName },
        };
        await writeFile(
          path.join(outDir, ".cursor-plugin", "plugin.json"),
          JSON.stringify(manifest, null, 2),
          "utf-8"
        );

        // Skills → skills/<skillName>/SKILL.md
        if (parsed.includeSkills) {
          const skillsDir = path.join(outDir, "skills");
          await mkdir(skillsDir, { recursive: true });
          for (const s of reg.skills ?? []) {
            if (!s.enabled) continue;
            const folder = path.join(skillsDir, s.name);
            await mkdir(folder, { recursive: true });
            const content = String(s.instructions ?? "").trim();
            if (!content) continue;
            await writeFile(path.join(folder, "SKILL.md"), content + "\n", "utf-8");
          }
        }

        // Rules → rules/<ruleName>.mdc
        if (parsed.includeRules) {
          const rulesDir = path.join(outDir, "rules");
          await mkdir(rulesDir, { recursive: true });
          for (const r of reg.rules ?? []) {
            if (!r.enabled) continue;
            const fileSafe = r.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
            const content = String(r.content ?? "").trim();
            if (!content) continue;
            await writeFile(path.join(rulesDir, `${fileSafe}.mdc`), content + "\n", "utf-8");
          }
        }

        onToolInvoked?.("admin_export_cursor_plugin");
        return toolResultCast({
          content: [
            {
              type: "text" as const,
              text:
                `OK: exported Cursor plugin to:\n\n` +
                `- ${outDir}\n\n` +
                `Install (local plugin): copy/symlink this folder into your Cursor local plugins directory, then reload Cursor.\n` +
                `- Windows: %USERPROFILE%\\.cursor\\plugins\\local\\${parsed.pluginName}\n` +
                `- macOS/Linux: ~/.cursor/plugins/local/${parsed.pluginName}`,
            },
          ],
          isError: false as const,
        });
      }
    );

    const publishCursorPluginBundleSchema = z.object({
      repoName: z
        .string()
        .min(1)
        .regex(/^[a-z0-9][a-z0-9-_]*$/, "repoName must be kebab-case like rs4it-cursor-plugin"),
      pluginName: z
        .string()
        .min(1)
        .regex(/^[a-z0-9][a-z0-9-_]*$/, "pluginName must be kebab-case like rs4it"),
      description: z.string().optional(),
      version: z.string().optional().default("0.1.0"),
      authorName: z.string().optional().default("RS4IT"),
      outputDir: z
        .string()
        .optional()
        .describe("Optional absolute output directory. If omitted, uses MCP_CURSOR_PLUGIN_EXPORT_DIR or ./exports/cursor-plugin-repos"),
      overwrite: z.boolean().optional().default(true),
      includeSkills: z.boolean().optional().default(true),
      includeRules: z.boolean().optional().default(true),
      /**
       * Optional: include an MCP config file inside the plugin bundle.
       * Cursor plugins can bundle MCP servers; users then just install the plugin.
       * We keep this optional because the Hub URL differs by environment.
       */
      includeMcpConfig: z.boolean().optional().default(false),
      mcpServerName: z.string().optional().default("rs4it-hub"),
      mcpUrl: z
        .string()
        .optional()
        .describe("If includeMcpConfig=true: MCP server URL (e.g. http://localhost:3000/mcp or https://.../mcp)."),
      mcpHeaders: z.record(z.string()).optional().describe("Optional headers for MCP server (e.g. Authorization)."),
    });
    server.registerTool(
      "admin_publish_cursor_plugin_bundle",
      {
        description:
          "Generate a git-ready Cursor Plugin repo (rules/skills + optional .mcp.json) suitable for Team Marketplace import (admin-only).",
        inputSchema: publishCursorPluginBundleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = publishCursorPluginBundleSchema.parse(args);

        const reg = await loadDynamicRegistry();
        const baseOut =
          parsed.outputDir?.trim() ||
          process.env["MCP_CURSOR_PLUGIN_EXPORT_DIR"] ||
          path.resolve(process.cwd(), "exports", "cursor-plugin-repos");
        const repoDir = path.resolve(baseOut, parsed.repoName);

        if (parsed.overwrite) {
          await rm(repoDir, { recursive: true, force: true });
        }
        await mkdir(repoDir, { recursive: true });

        // Manifest
        await mkdir(path.join(repoDir, ".cursor-plugin"), { recursive: true });
        const manifest = {
          name: parsed.pluginName,
          description: parsed.description ?? "RS4IT organization rules & skills",
          version: parsed.version,
          author: { name: parsed.authorName },
        };
        await writeFile(
          path.join(repoDir, ".cursor-plugin", "plugin.json"),
          JSON.stringify(manifest, null, 2),
          "utf-8"
        );

        // Skills → skills/<skillName>/SKILL.md
        let skillsWritten = 0;
        if (parsed.includeSkills) {
          const skillsDir = path.join(repoDir, "skills");
          await mkdir(skillsDir, { recursive: true });
          for (const s of reg.skills ?? []) {
            if (!s.enabled) continue;
            const folder = path.join(skillsDir, s.name);
            await mkdir(folder, { recursive: true });
            const content = String(s.instructions ?? "").trim();
            if (!content) continue;
            await writeFile(path.join(folder, "SKILL.md"), content + "\n", "utf-8");
            skillsWritten++;
          }
        }

        // Rules → rules/<ruleName>.mdc
        let rulesWritten = 0;
        if (parsed.includeRules) {
          const rulesDir = path.join(repoDir, "rules");
          await mkdir(rulesDir, { recursive: true });
          for (const r of reg.rules ?? []) {
            if (!r.enabled) continue;
            const fileSafe = r.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
            const content = String(r.content ?? "").trim();
            if (!content) continue;
            await writeFile(path.join(rulesDir, `${fileSafe}.mdc`), content + "\n", "utf-8");
            rulesWritten++;
          }
        }

        // Optional MCP config inside plugin
        if (parsed.includeMcpConfig) {
          const url = String(parsed.mcpUrl ?? "").trim();
          if (!url) {
            return toolResultCast(
              errorResult('includeMcpConfig=true requires "mcpUrl" (e.g. http://localhost:3000/mcp).')
            );
          }
          const mcpConfig: Record<string, unknown> = {
            mcpServers: {
              [parsed.mcpServerName ?? "rs4it-hub"]: {
                url,
                ...(parsed.mcpHeaders && Object.keys(parsed.mcpHeaders).length > 0 ? { headers: parsed.mcpHeaders } : {}),
              },
            },
          };
          await writeFile(path.join(repoDir, ".mcp.json"), JSON.stringify(mcpConfig, null, 2), "utf-8");
        }

        await writeFile(
          path.join(repoDir, "README.md"),
          [
            `# ${parsed.pluginName}`,
            ``,
            `This repository is a Cursor Plugin bundle generated from the RS4IT Hub registry.`,
            ``,
            `## Contents`,
            `- Rules: \`rules/\` (${rulesWritten})`,
            `- Skills: \`skills/\` (${skillsWritten})`,
            parsed.includeMcpConfig ? `- MCP config: \`.mcp.json\`` : `- MCP config: (not included)`,
            ``,
            `## Install (local dev)`,
            `Copy/symlink this repo folder into:`,
            `- Windows: \`%USERPROFILE%\\.cursor\\plugins\\local\\${parsed.pluginName}\``,
            `- macOS/Linux: \`~/.cursor/plugins/local/${parsed.pluginName}\``,
            ``,
            `Then reload Cursor.`,
            ``,
            `## Publish (Team Marketplace)`,
            `1) Push this repo to GitHub.`,
            `2) In Cursor Dashboard → Settings → Plugins → Team Marketplaces → Import, paste the repo URL.`,
            ``,
          ].join("\n"),
          "utf-8"
        );

        onToolInvoked?.("admin_publish_cursor_plugin_bundle");
        return toolResultCast({
          content: [
            {
              type: "text" as const,
              text:
                `OK: generated Cursor Plugin repo at:\n\n- ${repoDir}\n\n` +
                `Next steps:\n` +
                `- Push this folder to a Git repo (GitHub).\n` +
                `- Import it as a Team Marketplace plugin in Cursor Dashboard.\n` +
                `- Install the plugin in Cursor → Marketplace.\n`,
            },
          ],
          isError: false as const,
        });
      }
    );

    const upsertToolSchema = z.object({
      name: z.string().min(1).describe("Tool name (unique)."),
      description: z.string().optional().describe("Short description."),
      inputSchema: z.record(z.unknown()).optional().describe("Input schema object (flat JSON)."),
      handlerRef: z
        .enum(["create_file", "read_file", "run_command"])
        .describe("Built-in tool handler name used at runtime."),
      enabled: z.boolean().optional().default(true),
      allowedRoles: z.array(z.string()).optional().describe("Roles allowed to see/use this tool. Empty/omitted = visible to all."),
    });
    server.registerTool(
      "admin_upsert_tool",
      {
        description: "Create or update a Tool in the Hub registry (admin-only).",
        inputSchema: upsertToolSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = upsertToolSchema.parse(args);
        const rolesValidation = await validateAllowedRoles(parsed.allowedRoles);
        if (!rolesValidation.ok) return toolResultCast(errorResult(rolesValidation.error));

        const reg = await loadDynamicRegistry();
        reg.tools = Array.isArray(reg.tools) ? reg.tools : [];
        const now = new Date().toISOString();
        const idx = reg.tools.findIndex((t) => t.name === parsed.name);
        const next = {
          name: parsed.name,
          description: parsed.description ?? "",
          inputSchema: (parsed.inputSchema ?? {}) as Record<string, unknown>,
          handlerRef: parsed.handlerRef,
          enabled: parsed.enabled ?? true,
          updatedAt: now,
          allowedRoles: rolesValidation.value,
          source: "admin" as const,
        };
        if (idx === -1) reg.tools.push(next as any);
        else reg.tools[idx] = { ...reg.tools[idx], ...next } as any;
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_upsert_tool");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: tool "${parsed.name}" upserted. Reconnect client to refresh tools list if needed.` }], isError: false as const });
      }
    );

    const deleteToolSchema = z.object({ name: z.string().min(1) });
    server.registerTool(
      "admin_delete_tool",
      {
        description: "Delete a Tool from the Hub registry (admin-only).",
        inputSchema: deleteToolSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = deleteToolSchema.parse(args);
        const reg = await loadDynamicRegistry();
        reg.tools = Array.isArray(reg.tools) ? reg.tools : [];
        const before = reg.tools.length;
        reg.tools = reg.tools.filter((t) => t.name !== parsed.name);
        if (reg.tools.length === before) return toolResultCast(errorResult(`Tool not found: ${parsed.name}`));
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_delete_tool");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: tool "${parsed.name}" deleted. Reconnect client to refresh tools list if needed.` }], isError: false as const });
      }
    );

    const upsertRuleSchema = z.object({
      name: z.string().min(1).describe("Rule name (unique)."),
      description: z.string().optional().describe("Short description."),
      content: z.string().min(1).describe("Markdown content."),
      enabled: z.boolean().optional().default(true),
      allowedRoles: z.array(z.string()).optional().describe("Roles allowed to see/use this rule. Empty/omitted = visible to all."),
      globs: z.string().optional().describe("Optional file globs (Cursor-like)."),
    });
    server.registerTool(
      "admin_upsert_rule",
      {
        description: "Create or update a markdown Rule in the Hub registry (admin-only).",
        inputSchema: upsertRuleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = upsertRuleSchema.parse(args);
        const rolesValidation = await validateAllowedRoles(parsed.allowedRoles);
        if (!rolesValidation.ok) return toolResultCast(errorResult(rolesValidation.error));

        const reg = await loadDynamicRegistry();
        reg.rules = Array.isArray(reg.rules) ? reg.rules : [];
        const now = new Date().toISOString();
        const idx = reg.rules.findIndex((r) => r.name === parsed.name);
        const next = {
          name: parsed.name,
          description: parsed.description ?? "",
          content: parsed.content,
          enabled: parsed.enabled ?? true,
          updatedAt: now,
          allowedRoles: rolesValidation.value,
          source: "admin" as const,
          globs: parsed.globs?.trim() ? parsed.globs : undefined,
        };
        if (idx === -1) reg.rules.push(next);
        else reg.rules[idx] = { ...reg.rules[idx], ...next };
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_upsert_rule");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: rule "${parsed.name}" upserted. Reconnect client to refresh lists if needed.` }], isError: false as const });
      }
    );

    const deleteRuleSchema = z.object({ name: z.string().min(1) });
    server.registerTool(
      "admin_delete_rule",
      {
        description: "Delete a Rule from the Hub registry (admin-only).",
        inputSchema: deleteRuleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = deleteRuleSchema.parse(args);
        const reg = await loadDynamicRegistry();
        reg.rules = Array.isArray(reg.rules) ? reg.rules : [];
        const before = reg.rules.length;
        reg.rules = reg.rules.filter((r) => r.name !== parsed.name);
        if (reg.rules.length === before) return toolResultCast(errorResult(`Rule not found: ${parsed.name}`));
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_delete_rule");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: rule "${parsed.name}" deleted. Reconnect client to refresh lists if needed.` }], isError: false as const });
      }
    );

    const upsertSkillSchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      instructions: z.string().min(1).describe("Markdown instructions for the skill."),
      enabled: z.boolean().optional().default(true),
      allowedRoles: z.array(z.string()).optional(),
    });
    server.registerTool(
      "admin_upsert_skill",
      {
        description: "Create or update a written Skill (markdown) in the Hub registry (admin-only).",
        inputSchema: upsertSkillSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = upsertSkillSchema.parse(args);
        const rolesValidation = await validateAllowedRoles(parsed.allowedRoles);
        if (!rolesValidation.ok) return toolResultCast(errorResult(rolesValidation.error));

        const reg = await loadDynamicRegistry();
        reg.skills = Array.isArray(reg.skills) ? reg.skills : [];
        const now = new Date().toISOString();
        const idx = reg.skills.findIndex((s) => s.name === parsed.name);
        const next = {
          name: parsed.name,
          description: parsed.description ?? "",
          enabled: parsed.enabled ?? true,
          updatedAt: now,
          allowedRoles: rolesValidation.value,
          source: "admin" as const,
          instructions: parsed.instructions,
        };
        if (idx === -1) reg.skills.push(next as any);
        else reg.skills[idx] = { ...reg.skills[idx], ...next } as any;
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_upsert_skill");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: skill "${parsed.name}" upserted. Reconnect client to refresh tools list if needed.` }], isError: false as const });
      }
    );

    const deleteSkillSchema = z.object({ name: z.string().min(1) });
    server.registerTool(
      "admin_delete_skill",
      {
        description: "Delete a Skill from the Hub registry (admin-only).",
        inputSchema: deleteSkillSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = deleteSkillSchema.parse(args);
        const reg = await loadDynamicRegistry();
        reg.skills = Array.isArray(reg.skills) ? reg.skills : [];
        const before = reg.skills.length;
        reg.skills = reg.skills.filter((s) => s.name !== parsed.name);
        if (reg.skills.length === before) return toolResultCast(errorResult(`Skill not found: ${parsed.name}`));
        await writeDynamicRegistry(reg);
        onToolInvoked?.("admin_delete_skill");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: skill "${parsed.name}" deleted. Reconnect client to refresh tools list if needed.` }], isError: false as const });
      }
    );

    const upsertRoleSchema = z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      inherits: z.array(z.string()).optional(),
    });
    server.registerTool(
      "admin_upsert_role",
      {
        description: "Create or update a Role definition (config/roles.json) (admin-only).",
        inputSchema: upsertRoleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = upsertRoleSchema.parse(args);
        const cfg = await loadRoleConfig();
        cfg.roles = Array.isArray(cfg.roles) ? cfg.roles : [];
        const idx = cfg.roles.findIndex((r) => r.id === parsed.id);
        const entry = {
          id: parsed.id,
          name: (parsed.name ?? parsed.id).trim(),
          inherits: parsed.inherits && parsed.inherits.length > 0 ? parsed.inherits : undefined,
        };
        if (idx === -1) cfg.roles.push(entry);
        else cfg.roles[idx] = { ...cfg.roles[idx], ...entry };
        await writeRoleConfig(cfg);
        onToolInvoked?.("admin_upsert_role");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: role "${parsed.id}" upserted. Reconnect client to refresh visibility if needed.` }], isError: false as const });
      }
    );

    const deleteRoleSchema = z.object({ id: z.string().min(1) });
    server.registerTool(
      "admin_delete_role",
      {
        description: "Delete a Role definition (admin-only).",
        inputSchema: deleteRoleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = deleteRoleSchema.parse(args);
        const cfg = await loadRoleConfig();
        cfg.roles = Array.isArray(cfg.roles) ? cfg.roles : [];
        const before = cfg.roles.length;
        cfg.roles = cfg.roles.filter((r) => r.id !== parsed.id);
        if (cfg.roles.length === before) return toolResultCast(errorResult(`Role not found: ${parsed.id}`));
        if (cfg.defaultRole === parsed.id) cfg.defaultRole = undefined;
        await writeRoleConfig(cfg);
        onToolInvoked?.("admin_delete_role");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: role "${parsed.id}" deleted.` }], isError: false as const });
      }
    );

    const setDefaultRoleSchema = z.object({ id: z.string().min(1) });
    server.registerTool(
      "admin_set_default_role",
      {
        description: "Set default role used when client doesn't send X-MCP-Role (admin-only).",
        inputSchema: setDefaultRoleSchema,
      } as Parameters<McpServer["registerTool"]>[1],
      async (args: unknown) => {
        const hdrErr = headersValidationError(args);
        if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
        const parsed = setDefaultRoleSchema.parse(args);
        const cfg = await loadRoleConfig();
        const known = new Set((cfg.roles ?? []).map((r) => r.id));
        if (!known.has(parsed.id)) return toolResultCast(errorResult(`Unknown role id: ${parsed.id}`));
        cfg.defaultRole = parsed.id;
        await writeRoleConfig(cfg);
        onToolInvoked?.("admin_set_default_role");
        return toolResultCast({ content: [{ type: "text" as const, text: `OK: defaultRole set to "${parsed.id}".` }], isError: false as const });
      }
    );

    server.registerTool(
      "admin_hint_reconnect",
      {
        description: "Return a note to reconnect/re-initialize to refresh tool lists (admin-only).",
        inputSchema: z.object({}),
      } as Parameters<McpServer["registerTool"]>[1],
      async (_args: unknown) => {
        onToolInvoked?.("admin_hint_reconnect");
        return toolResultCast({
          content: [{ type: "text" as const, text: "Reconnect / re-initialize your MCP connection to refresh tools/resources after registry changes." }],
          isError: false as const,
        });
      }
    );
  }

  for (const entry of dynamic.tools) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const handlerRef = entry.handlerRef;
    const toolName = entry.name;
    try {
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
    } catch (e) {
      console.error(`[rs4it-mcp] Skipping dynamic tool "${toolName}":`, e);
    }
  }
  for (const entry of dynamic.skills) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const toolName = skillToToolName(entry.name);
    const instructions = String(entry.instructions ?? "").trim();
    try {
      server.registerTool(
        toolName,
        {
          description: `[Skill] ${entry.description}`,
          inputSchema: jsonSchemaToZod({} as Record<string, unknown>),
        } as Parameters<McpServer["registerTool"]>[1],
        async (args: unknown) => {
          const hdrErr = headersValidationError(args);
          if (hdrErr) return toolResultCast(errorResult(hdrErr.message));
          onToolInvoked?.(toolName);
          return toolResultCast({
            content: [
              {
                type: "text" as const,
                text: instructions
                  ? `## Skill\n\n${instructions}`
                  : "Skill has no instructions.",
              },
            ],
            isError: false,
          });
        }
      );
    } catch (e) {
      console.error(`[rs4it-mcp] Skipping dynamic skill "${entry.name}":`, e);
    }
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
    try {
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
    } catch (e) {
      console.error(`[rs4it-mcp] Skipping dynamic prompt "${entry.name}":`, e);
    }
  }

  for (const entry of dynamic.resources) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const uri = entry.uri;
    const mimeType = entry.mimeType;
    const content = entry.content;
    try {
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
    } catch (e) {
      console.error(`[rs4it-mcp] Skipping dynamic resource "${entry.name}":`, e);
    }
  }

  // Dynamic rules: exposed as resources (Cursor-like rules as markdown).
  for (const entry of dynamic.rules ?? []) {
    if (!entry.enabled) continue;
    if (role && !(await isAllowedForRole(entry.allowedRoles, role))) continue;
    const uri = `rs4it://rules/${encodeURIComponent(entry.name)}`;
    const mimeType = "text/markdown";
    const text = entry.content ?? "";
    const resourceName = `rule:${entry.name}`;
    try {
      server.registerResource(
        resourceName,
        uri,
        {
          title: entry.name,
          description: entry.description ?? undefined,
        },
        async () => ({
          contents: [{ uri, mimeType, text }],
        })
      );
    } catch (e) {
      console.error(`[rs4it-mcp] Skipping dynamic rule "${entry.name}":`, e);
    }
  }

  return server;
}

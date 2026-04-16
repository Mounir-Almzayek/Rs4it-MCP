/**
 * Cursor config generator — writes configs to .cursor/{rules,tools,skills,prompts,resources,agents}/
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator, plainFileName, displayName, slugify, normalizeSkillContent } from "./base.js";

function mdcFile(description: string, body: string, globs?: string): string {
  const lines = [
    "---",
    `description: ${description}`,
    `globs: ${globs ?? ""}`,
    "alwaysApply: true",
    "---",
    "",
    body,
  ];
  return lines.join("\n");
}

function formatToolParams(params: Record<string, unknown>): string {
  const props = (params as any)?.properties ?? params;
  if (!props || typeof props !== "object") return "None";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(props)) {
    const desc = (v as any)?.description ?? (v as any)?.type ?? "unknown";
    lines.push(`- \`${k}\`: ${desc}`);
  }
  return lines.length > 0 ? lines.join("\n") : "None";
}

export class CursorConfigGenerator extends BaseGenerator {
  async generate(content: ContentPayload, options: GeneratorOptions): Promise<GeneratedFile[]> {
    const cursorDir = path.join(options.workspaceRoot, ".cursor");
    const rulesDir = path.join(cursorDir, "rules");
    const toolsDir = path.join(cursorDir, "tools");
    const skillsDir = path.join(cursorDir, "skills");
    const promptsDir = path.join(cursorDir, "prompts");
    const resourcesDir = path.join(cursorDir, "resources");
    const agentsDir = path.join(cursorDir, "agents");
    const files: GeneratedFile[] = [];

    // Hub overview
    const overviewBody = [
      `# ${content.hubName} v${content.hubVersion}`,
      "",
      `This workspace is connected to the RS4IT MCP Hub.`,
      "",
      `## Available Tools (${content.tools.length})`,
      ...content.tools.map((t) => `- **${displayName(t.name)}**: ${t.description}`),
      "",
      `## Available Skills (${content.skills.length})`,
      ...content.skills.map((s) => `- **${displayName(s.name)}**: ${s.description}`),
      "",
      `## Rules (${content.rules.length})`,
      ...content.rules.map((r) => `- **${displayName(r.name)}**: ${r.description}`),
      "",
      `## Prompts (${content.prompts.length})`,
      ...content.prompts.map((p) => `- **${displayName(p.name)}**: ${p.description ?? "No description"}`),
      "",
      `## Resources (${content.resources.length})`,
      ...content.resources.map((r) => `- **${displayName(r.name)}**: ${r.uri}`),
      "",
      `## Subagents (${content.subagents.length})`,
      ...content.subagents.map((s) => `- **${displayName(s.name)}**: ${s.description ?? "No description"}`),
      "",
      `## Commands (${content.commands.length})`,
      ...content.commands.map((c) => `- **${displayName(c.name)}**: ${c.description ?? "No description"}`),
    ].join("\n");

    files.push({
      path: path.join(rulesDir, "overview.mdc"),
      content: mdcFile("RS4IT MCP Hub overview — available tools, skills, and rules", overviewBody),
    });

    // Rules
    for (const r of content.rules) {
      files.push({
        path: path.join(rulesDir, plainFileName(displayName(r.name), ".mdc")),
        content: mdcFile(r.description, r.content, r.globs),
      });
    }

    // Tools
    for (const t of content.tools) {
      const body = [
        `# Tool: ${displayName(t.name)}`,
        "",
        t.description,
        "",
        "## Parameters",
        formatToolParams(t.parameters),
      ].join("\n");
      files.push({
        path: path.join(toolsDir, plainFileName(displayName(t.name), ".mdc")),
        content: mdcFile(`Tool: ${displayName(t.name)} — ${t.description}`, body),
      });
    }

    // Skills
    for (const s of content.skills) {
      const skillName = displayName(s.name);
      const skillBody = normalizeSkillContent(String(s.content ?? "")) || [
        "---",
        `name: ${slugify(skillName)}`,
        `description: ${s.description}`,
        "---",
        "",
        `# ${skillName}`,
      ].join("\n");
      files.push({
        path: path.join(skillsDir, slugify(skillName), "SKILL.md"),
        content: skillBody,
      });
    }

    // Prompts
    for (const p of content.prompts) {
      const body = [
        `# Prompt: ${displayName(p.name)}`,
        "",
        p.description ?? "No description.",
        "",
        "## Content",
        p.content,
      ].join("\n");
      files.push({
        path: path.join(promptsDir, plainFileName(displayName(p.name), ".mdc")),
        content: mdcFile(`Prompt: ${displayName(p.name)} — ${p.description ?? "No description"}`, body),
      });
    }

    // Resources
    for (const r of content.resources) {
      const body = [
        `# Resource: ${displayName(r.name)}`,
        "",
        r.description ?? "No description.",
        "",
        `- URI: ${r.uri}`,
        `- MIME Type: ${r.mimeType}`,
        "",
        "## Content",
        r.content,
      ].join("\n");
      files.push({
        path: path.join(resourcesDir, plainFileName(displayName(r.name), ".mdc")),
        content: mdcFile(`Resource: ${displayName(r.name)} — ${r.description ?? r.uri}`, body),
      });
    }

    // Subagents
    for (const sa of content.subagents) {
      const body = [
        "---",
        `name: ${slugify(displayName(sa.name))}`,
        `description: ${sa.description ?? "Subagent"}`,
        `model: ${sa.model ?? "inherit"}`,
        `readonly: ${Boolean(sa.readonly)}`,
        `is_background: ${Boolean(sa.isBackground)}`,
        "---",
        "",
        sa.content,
      ].join("\n");
      files.push({
        path: path.join(agentsDir, `${slugify(displayName(sa.name))}.md`),
        content: body,
      });
    }

    // Commands (represented as explicit-invocation skills)
    for (const c of content.commands) {
      const commandName = displayName(c.name);
      const body = [
        "---",
        `name: ${slugify(commandName)}`,
        `description: ${c.description ?? "Command"}`,
        "disable-model-invocation: true",
        "---",
        "",
        `# ${commandName}`,
        "",
        c.content,
      ].join("\n");
      files.push({
        path: path.join(skillsDir, slugify(commandName), "SKILL.md"),
        content: body,
      });
    }

    if (!options.dryRun) {
      // Write all
      await this.writeFiles(files);

      // Cleanup stale files by folder
      await this.cleanupStaleFiles(toolsDir, new Set(files.filter((f) => f.path.startsWith(toolsDir)).map((f) => f.path)), ".mdc");
      await this.cleanupStaleFiles(promptsDir, new Set(files.filter((f) => f.path.startsWith(promptsDir)).map((f) => f.path)), ".mdc");
      await this.cleanupStaleFiles(resourcesDir, new Set(files.filter((f) => f.path.startsWith(resourcesDir)).map((f) => f.path)), ".mdc");
      await this.cleanupStaleFiles(rulesDir, new Set(files.filter((f) => f.path.startsWith(rulesDir)).map((f) => f.path)), ".mdc");
      await this.cleanupStaleFiles(agentsDir, new Set(files.filter((f) => f.path.startsWith(agentsDir)).map((f) => f.path)), ".md");
      await this.cleanupStaleDirs(
        skillsDir,
        new Set([
          ...content.skills.map((s) => slugify(displayName(s.name))),
          ...content.commands.map((c) => slugify(displayName(c.name))),
        ])
      );
    }

    return files;
  }
}

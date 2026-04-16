/**
 * Claude Code config generator — writes CLAUDE.md + .claude/commands/
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator, plainFileName, displayName, slugify, normalizeSkillContent } from "./base.js";

export class ClaudeConfigGenerator extends BaseGenerator {
  async generate(content: ContentPayload, options: GeneratorOptions): Promise<GeneratedFile[]> {
    const claudeDir = path.join(options.workspaceRoot, ".claude");
    const commandsDir = path.join(claudeDir, "commands");
    const skillsDir = path.join(claudeDir, "skills");
    const agentsDir = path.join(claudeDir, "agents");
    const files: GeneratedFile[] = [];

    // CLAUDE.md — main file with rules + hub overview
    const claudeMdSections: string[] = [
      `# RS4IT MCP Hub — ${content.hubName} v${content.hubVersion}`,
      "",
      "This workspace is connected to the RS4IT MCP Hub.",
      "",
    ];

    // Rules
    if (content.rules.length > 0) {
      claudeMdSections.push("## Rules", "");
      for (const r of content.rules) {
        claudeMdSections.push(`### ${displayName(r.name)}`, "", r.content, "");
      }
    }

    // Tool index
    if (content.tools.length > 0) {
      claudeMdSections.push("## Available Tools", "");
      for (const t of content.tools) {
        claudeMdSections.push(`- **${displayName(t.name)}**: ${t.description}`);
      }
      claudeMdSections.push("");
    }

    // Skill index
    if (content.skills.length > 0) {
      claudeMdSections.push("## Available Skills", "");
      for (const s of content.skills) {
        claudeMdSections.push(`- **${displayName(s.name)}**: ${s.description}`);
      }
      claudeMdSections.push("");
    }

    // Prompt index
    if (content.prompts.length > 0) {
      claudeMdSections.push("## Available Prompts", "");
      for (const p of content.prompts) {
        claudeMdSections.push(`- **${displayName(p.name)}**: ${p.description ?? "No description"}`);
      }
      claudeMdSections.push("");
    }

    // Resource index
    if (content.resources.length > 0) {
      claudeMdSections.push("## Available Resources", "");
      for (const r of content.resources) {
        claudeMdSections.push(`- **${displayName(r.name)}** (${r.mimeType}): ${r.uri}`);
      }
      claudeMdSections.push("");
    }

    if (content.subagents.length > 0) {
      claudeMdSections.push("## Available Subagents", "");
      for (const s of content.subagents) {
        claudeMdSections.push(`- **${displayName(s.name)}**: ${s.description ?? "No description"}`);
      }
      claudeMdSections.push("");
    }

    if (content.commands.length > 0) {
      claudeMdSections.push("## Available Commands", "");
      for (const c of content.commands) {
        claudeMdSections.push(`- **/${displayName(c.name)}**: ${c.description ?? "No description"}`);
      }
      claudeMdSections.push("");
    }

    files.push({
      path: path.join(options.workspaceRoot, "CLAUDE.md"),
      content: claudeMdSections.join("\n"),
    });

    // Command files — tools
    for (const t of content.tools) {
      const toolName = displayName(t.name);
      const body = [
        `# ${toolName}`,
        "",
        t.description,
        "",
        `Use the MCP tool \`${t.name}\` to execute this.`,
      ].join("\n");
      files.push({
        path: path.join(commandsDir, plainFileName(toolName, ".md")),
        content: body,
      });
    }

    // Skills
    for (const s of content.skills) {
      const skillName = displayName(s.name);
      const body = normalizeSkillContent(String(s.content ?? "")) || [
        "---",
        `name: ${slugify(skillName)}`,
        `description: ${s.description}`,
        "---",
        "",
        `# ${skillName}`,
      ].join("\n");
      files.push({
        path: path.join(skillsDir, slugify(skillName), "SKILL.md"),
        content: body,
      });
    }

    // Command files — prompts
    for (const p of content.prompts) {
      const promptName = displayName(p.name);
      const body = [
        `# ${promptName}`,
        "",
        p.description ?? "No description.",
        "",
        "## Prompt Content",
        p.content,
      ].join("\n");
      files.push({
        path: path.join(commandsDir, plainFileName(promptName, ".md")),
        content: body,
      });
    }

    // Command files — resources
    for (const r of content.resources) {
      const resourceName = displayName(r.name);
      const body = [
        `# ${resourceName}`,
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
        path: path.join(commandsDir, plainFileName(resourceName, ".md")),
        content: body,
      });
    }

    // Command files — explicit commands
    for (const c of content.commands) {
      const commandName = displayName(c.name);
      const body = [
        `# /${commandName}`,
        "",
        c.description ?? "No description.",
        "",
        c.content,
      ].join("\n");
      files.push({
        path: path.join(commandsDir, plainFileName(commandName, ".md")),
        content: body,
      });
    }

    // Subagent files
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

    if (!options.dryRun) {
      await this.writeFiles(files);

      // Cleanup stale command files
      const currentCommandPaths = new Set(
        files.filter((f) => f.path.startsWith(commandsDir)).map((f) => f.path)
      );
      await this.cleanupStaleFiles(commandsDir, currentCommandPaths, ".md");
      await this.cleanupStaleFiles(agentsDir, new Set(files.filter((f) => f.path.startsWith(agentsDir)).map((f) => f.path)), ".md");
      await this.cleanupStaleDirs(skillsDir, new Set(content.skills.map((s) => slugify(displayName(s.name)))));
    }

    return files;
  }
}

/**
 * Claude Code config generator — writes CLAUDE.md + .claude/commands/
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator, rs4itFileName } from "./base.js";

export class ClaudeConfigGenerator extends BaseGenerator {
  async generate(content: ContentPayload, options: GeneratorOptions): Promise<GeneratedFile[]> {
    const claudeDir = path.join(options.workspaceRoot, ".claude");
    const commandsDir = path.join(claudeDir, "commands");
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
        claudeMdSections.push(`### ${r.name}`, "", r.content, "");
      }
    }

    // Tool index
    if (content.tools.length > 0) {
      claudeMdSections.push("## Available Tools", "");
      for (const t of content.tools) {
        claudeMdSections.push(`- **${t.name}**: ${t.description}`);
      }
      claudeMdSections.push("");
    }

    // Skill index
    if (content.skills.length > 0) {
      claudeMdSections.push("## Available Skills", "");
      for (const s of content.skills) {
        claudeMdSections.push(`- **skills_${s.name}**: ${s.description}`);
      }
      claudeMdSections.push("");
    }

    files.push({
      path: path.join(options.workspaceRoot, "CLAUDE.md"),
      content: claudeMdSections.join("\n"),
    });

    // Command files — tools
    for (const t of content.tools) {
      const body = [
        `# ${t.name}`,
        "",
        t.description,
        "",
        `Use the MCP tool \`${t.name}\` to execute this.`,
      ].join("\n");
      files.push({
        path: path.join(commandsDir, rs4itFileName("tool", t.name, ".md")),
        content: body,
      });
    }

    // Command files — skills
    for (const s of content.skills) {
      const body = [
        `# ${s.name}`,
        "",
        s.description,
        "",
        `Use the MCP tool \`skills_${s.name}\` to execute this.`,
        "",
        s.content,
      ].join("\n");
      files.push({
        path: path.join(commandsDir, rs4itFileName("skill", s.name, ".md")),
        content: body,
      });
    }

    await this.writeFiles(files);

    // Cleanup stale command files
    const currentCommandPaths = new Set(
      files.filter((f) => f.path.startsWith(commandsDir)).map((f) => f.path)
    );
    await this.cleanupStaleFiles(commandsDir, currentCommandPaths, ".md");

    return files;
  }
}

/**
 * Cursor config generator — writes .mdc files to .cursor/rules/
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator, rs4itFileName } from "./base.js";

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
    const rulesDir = path.join(options.workspaceRoot, ".cursor", "rules");
    const files: GeneratedFile[] = [];

    // Hub overview
    const overviewBody = [
      `# ${content.hubName} v${content.hubVersion}`,
      "",
      `This workspace is connected to the RS4IT MCP Hub.`,
      "",
      `## Available Tools (${content.tools.length})`,
      ...content.tools.map((t) => `- **${t.name}**: ${t.description}`),
      "",
      `## Available Skills (${content.skills.length})`,
      ...content.skills.map((s) => `- **skills_${s.name}**: ${s.description}`),
      "",
      `## Rules (${content.rules.length})`,
      ...content.rules.map((r) => `- **${r.name}**: ${r.description}`),
    ].join("\n");

    files.push({
      path: path.join(rulesDir, rs4itFileName("hub", "overview", ".mdc")),
      content: mdcFile("RS4IT MCP Hub overview — available tools, skills, and rules", overviewBody),
    });

    // Rules
    for (const r of content.rules) {
      files.push({
        path: path.join(rulesDir, rs4itFileName("rule", r.name, ".mdc")),
        content: mdcFile(r.description, r.content, r.globs),
      });
    }

    // Tools
    for (const t of content.tools) {
      const body = [
        `# Tool: ${t.name}`,
        "",
        t.description,
        "",
        "## Parameters",
        formatToolParams(t.parameters),
      ].join("\n");
      files.push({
        path: path.join(rulesDir, rs4itFileName("tool", t.name, ".mdc")),
        content: mdcFile(`Tool: ${t.name} — ${t.description}`, body),
      });
    }

    // Skills
    for (const s of content.skills) {
      const body = [
        `# Skill: ${s.name}`,
        "",
        s.description,
        "",
        `To use this skill, call the tool \`skills_${s.name}\`.`,
        "",
        s.content,
      ].join("\n");
      files.push({
        path: path.join(rulesDir, rs4itFileName("skill", s.name, ".mdc")),
        content: mdcFile(`Skill: ${s.name} — ${s.description}`, body),
      });
    }

    // Write all
    await this.writeFiles(files);

    // Cleanup stale rs4it-* files
    const currentPaths = new Set(files.map((f) => f.path));
    await this.cleanupStaleFiles(rulesDir, currentPaths, ".mdc");

    return files;
  }
}

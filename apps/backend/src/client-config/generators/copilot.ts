/**
 * Copilot config generator — writes .github/copilot-instructions.md
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator, displayName } from "./base.js";

export class CopilotConfigGenerator extends BaseGenerator {
  async generate(content: ContentPayload, options: GeneratorOptions): Promise<GeneratedFile[]> {
    const githubDir = path.join(options.workspaceRoot, ".github");
    const sections: string[] = [
      `# RS4IT MCP Hub — ${content.hubName} v${content.hubVersion}`,
      "",
      "This workspace is connected to the RS4IT MCP Hub.",
      "",
    ];

    // Rules
    if (content.rules.length > 0) {
      sections.push("## Rules", "");
      for (const r of content.rules) {
        sections.push(`### ${displayName(r.name)}`, "", r.content, "");
      }
    }

    // Tools
    if (content.tools.length > 0) {
      sections.push("## Available Tools", "");
      for (const t of content.tools) {
        sections.push(`### ${displayName(t.name)}`, "", t.description, "");
      }
    }

    // Skills
    if (content.skills.length > 0) {
      sections.push("## Available Skills", "");
      for (const s of content.skills) {
        sections.push(`### ${displayName(s.name)}`, "", s.description, "", s.content, "");
      }
    }

    // Prompts
    if (content.prompts.length > 0) {
      sections.push("## Available Prompts", "");
      for (const p of content.prompts) {
        sections.push(`### ${displayName(p.name)}`, "", p.description ?? "No description.", "", p.content, "");
      }
    }

    // Resources
    if (content.resources.length > 0) {
      sections.push("## Available Resources", "");
      for (const r of content.resources) {
        sections.push(
          `### ${displayName(r.name)}`,
          "",
          r.description ?? "No description.",
          "",
          `- URI: ${r.uri}`,
          `- MIME Type: ${r.mimeType}`,
          "",
          r.content,
          ""
        );
      }
    }

    if (content.subagents.length > 0) {
      sections.push("## Available Subagents", "");
      for (const sa of content.subagents) {
        sections.push(
          `### ${displayName(sa.name)}`,
          "",
          sa.description ?? "No description.",
          "",
          `- model: ${sa.model ?? "inherit"}`,
          `- readonly: ${String(Boolean(sa.readonly))}`,
          `- background: ${String(Boolean(sa.isBackground))}`,
          "",
          sa.content,
          ""
        );
      }
    }

    if (content.commands.length > 0) {
      sections.push("## Available Commands", "");
      for (const c of content.commands) {
        sections.push(`### /${displayName(c.name)}`, "", c.description ?? "No description.", "", c.content, "");
      }
    }

    const files: GeneratedFile[] = [
      {
        path: path.join(githubDir, "copilot-instructions.md"),
        content: sections.join("\n"),
      },
    ];

    if (!options.dryRun) {
      await this.writeFiles(files);
    }
    return files;
  }
}

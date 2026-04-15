/**
 * Copilot config generator — writes .github/copilot-instructions.md
 */

import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";
import { BaseGenerator } from "./base.js";

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
        sections.push(`### ${r.name}`, "", r.content, "");
      }
    }

    // Tools
    if (content.tools.length > 0) {
      sections.push("## Available Tools", "");
      for (const t of content.tools) {
        sections.push(`### ${t.name}`, "", t.description, "");
      }
    }

    // Skills
    if (content.skills.length > 0) {
      sections.push("## Available Skills", "");
      for (const s of content.skills) {
        sections.push(`### skills_${s.name}`, "", s.description, "", s.content, "");
      }
    }

    const files: GeneratedFile[] = [
      {
        path: path.join(githubDir, "copilot-instructions.md"),
        content: sections.join("\n"),
      },
    ];

    await this.writeFiles(files);
    return files;
  }
}

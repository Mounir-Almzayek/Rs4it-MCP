/**
 * Sync cursor-authored content from Hub dynamic registry into workspace `.cursor/`.
 *
 * Goal: make skills/rules appear in Cursor UI without manual sync.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { SkillDefinition } from "../types/skills.js";
import type { ToolCallResult } from "../types/tools.js";
import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { getWorkspaceRoot, resolveWithinWorkspace } from "../config/workspace.js";

export const SYNC_CURSOR_CONTENT_NAME = "sync_cursor_content" as const;

const inputSchema = {
  /**
   * Which output to generate.
   * - workspace-cursor: writes to `<workspaceRoot>/.cursor/...` (Cursor workspace UI)
   * - plugin-bundle: writes to `workspace/cursor-plugins/rs4it-hub/...` (local plugin folder)
   * - both: writes both
   */
  mode: z.enum(["workspace-cursor", "plugin-bundle", "both"]).default("workspace-cursor"),
  /** Overwrite generated files (always true-ish in practice). */
  overwrite: z.boolean().optional().default(true),
  /**
   * Best-effort cleanup of generated files only (does not delete user-authored unrelated content).
   * If true, removes previously generated files for skills/rules we manage.
   */
  cleanupGenerated: z.boolean().optional().default(false),
};

export type SyncCursorContentArgs = z.infer<z.ZodObject<typeof inputSchema>>;

function safeFolderName(input: string): string {
  return String(input)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
}

function safeRuleFileName(input: string): string {
  return String(input).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

async function writeWorkspaceCursor(reg: Awaited<ReturnType<typeof loadDynamicRegistry>>, args: SyncCursorContentArgs) {
  const workspaceRoot = getWorkspaceRoot();

  const skillsOutRoot = resolveWithinWorkspace(workspaceRoot, ".cursor/skills");
  const rulesOutRoot = resolveWithinWorkspace(workspaceRoot, ".cursor/rules");

  await mkdir(skillsOutRoot, { recursive: true });
  await mkdir(rulesOutRoot, { recursive: true });

  let skillsWritten = 0;
  for (const s of reg.skills ?? []) {
    if (!s.enabled) continue;
    const folder = safeFolderName(s.name) || "skill";
    const content = String(s.instructions ?? "").trim();
    if (!content) continue;

    const skillFile = resolveWithinWorkspace(
      workspaceRoot,
      path.join(".cursor", "skills", folder, "SKILL.md")
    );

    if (args.cleanupGenerated) {
      // Best-effort cleanup: remove the specific file we manage.
      await rm(skillFile, { force: true });
    }

    await mkdir(path.dirname(skillFile), { recursive: true });
    await writeFile(skillFile, content + "\n", "utf-8");
    skillsWritten++;
  }

  let rulesWritten = 0;
  for (const r of reg.rules ?? []) {
    if (!r.enabled) continue;
    const content = String(r.content ?? "").trim();
    if (!content) continue;

    const fileSafe = safeRuleFileName(r.name) || "rule";
    const ruleFile = resolveWithinWorkspace(
      workspaceRoot,
      path.join(".cursor", "rules", `${fileSafe}.mdc`)
    );

    if (args.cleanupGenerated) {
      await rm(ruleFile, { force: true });
    }

    await mkdir(path.dirname(ruleFile), { recursive: true });
    await writeFile(ruleFile, content + "\n", "utf-8");
    rulesWritten++;
  }

  return { skillsWritten, rulesWritten };
}

async function writePluginBundle(reg: Awaited<ReturnType<typeof loadDynamicRegistry>>, args: SyncCursorContentArgs) {
  // Keep consistent with existing sync plugin script default.
  const workspaceRoot = getWorkspaceRoot();
  const pluginDir = resolveWithinWorkspace(
    workspaceRoot,
    path.join("workspace", "cursor-plugins", "rs4it-hub")
  );

  await mkdir(pluginDir, { recursive: true });
  await mkdir(path.join(pluginDir, ".cursor-plugin"), { recursive: true });

  // Manifest: minimal (Cursor plugin requires plugin.json).
  const manifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
  const manifest = {
    name: "rs4it-hub",
    description: "Synced from RS4IT MCP Hub dynamic registry",
    version: "0.1.0",
    author: { name: "RS4IT" },
  };
  if (args.overwrite) {
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }

  const skillsOutRoot = path.join(pluginDir, "skills");
  const rulesOutRoot = path.join(pluginDir, "rules");
  await mkdir(skillsOutRoot, { recursive: true });
  await mkdir(rulesOutRoot, { recursive: true });

  let skillsWritten = 0;
  for (const s of reg.skills ?? []) {
    if (!s.enabled) continue;
    const folder = safeFolderName(s.name) || "skill";
    const content = String(s.instructions ?? "").trim();
    if (!content) continue;

    const skillFile = path.join(skillsOutRoot, folder, "SKILL.md");
    if (args.cleanupGenerated) await rm(skillFile, { force: true });

    await mkdir(path.dirname(skillFile), { recursive: true });
    await writeFile(skillFile, content + "\n", "utf-8");
    skillsWritten++;
  }

  let rulesWritten = 0;
  for (const r of reg.rules ?? []) {
    if (!r.enabled) continue;
    const content = String(r.content ?? "").trim();
    if (!content) continue;

    const fileSafe = safeRuleFileName(r.name) || "rule";
    const ruleFile = path.join(rulesOutRoot, `${fileSafe}.mdc`);
    if (args.cleanupGenerated) await rm(ruleFile, { force: true });

    await mkdir(path.dirname(ruleFile), { recursive: true });
    await writeFile(ruleFile, content + "\n", "utf-8");
    rulesWritten++;
  }

  return { skillsWritten, rulesWritten };
}

async function handler(args: SyncCursorContentArgs): Promise<ToolCallResult> {
  try {
    const reg = await loadDynamicRegistry();

    const outputs: Array<{ where: string; skillsWritten: number; rulesWritten: number }> = [];

    if (args.mode === "workspace-cursor" || args.mode === "both") {
      const r = await writeWorkspaceCursor(reg, args);
      outputs.push({ where: "workspace .cursor", ...r });
    }
    if (args.mode === "plugin-bundle" || args.mode === "both") {
      const r = await writePluginBundle(reg, args);
      outputs.push({ where: "workspace/cursor-plugins bundle", ...r });
    }

    const summary = outputs
      .map((o) => `- ${o.where}: skills=${o.skillsWritten}, rules=${o.rulesWritten}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text:
            `Cursor sync OK.\n\n` +
            `${summary}\n\n` +
            `If Cursor UI doesn't refresh automatically, reload the window.`,
        },
      ],
      isError: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

export const syncCursorContentSkill: SkillDefinition<SyncCursorContentArgs> = {
  name: SYNC_CURSOR_CONTENT_NAME,
  description: "Sync enabled Hub dynamic-registry skills/rules into workspace .cursor (and/or local plugin bundle) so they show up in Cursor UI.",
  inputSchema,
  handler,
};


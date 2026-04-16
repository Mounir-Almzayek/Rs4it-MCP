/**
 * Base class for client config generators.
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function plainFileName(name: string, ext: string): string {
  return `${slugify(name)}${ext}`;
}

export function displayName(name: string): string {
  return name
    .replace(/^skills_/, "")
    .replace(/^plugin_prompt_/, "")
    .replace(/^plugin_res_/, "")
    .replace(/^plugin_/, "");
}

export function normalizeSkillContent(rawContent: string): string {
  const raw = String(rawContent ?? "").trim();
  if (!raw) return raw;
  const duplicated = raw.match(/^---[\s\S]*?\n---\n\n#[^\n]+\n\n(---[\s\S]*)$/);
  return duplicated ? duplicated[1].trim() : raw;
}

export abstract class BaseGenerator {
  abstract generate(content: ContentPayload, options: GeneratorOptions): Promise<GeneratedFile[]>;

  protected async writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const f of files) {
      await mkdir(path.dirname(f.path), { recursive: true });
      await writeFile(f.path, f.content, "utf-8");
    }
  }

  protected async cleanupStaleFiles(dir: string, currentFiles: Set<string>, ext: string): Promise<string[]> {
    const removed: string[] = [];
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        if (!entry.endsWith(ext)) continue;
        if (entry.startsWith(".")) continue;
        if (entry.toUpperCase() === "SKILL.MD") continue;
        const full = path.join(dir, entry);
        if (!currentFiles.has(full)) {
          await rm(full, { force: true });
          removed.push(entry);
        }
      }
    } catch {
      // Directory may not exist yet
    }
    return removed;
  }

  protected async cleanupStaleDirs(dir: string, currentDirNames: Set<string>): Promise<string[]> {
    const removed: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".")) continue;
        if (!currentDirNames.has(entry.name)) {
          await rm(path.join(dir, entry.name), { recursive: true, force: true });
          removed.push(entry.name);
        }
      }
    } catch {
      // Directory may not exist yet
    }
    return removed;
  }
}

/**
 * Base class for client config generators.
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentPayload, GeneratedFile, GeneratorOptions } from "../types.js";

const RS4IT_PREFIX = "rs4it-";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function rs4itFileName(category: string, name: string, ext: string): string {
  return `${RS4IT_PREFIX}${category}-${slugify(name)}${ext}`;
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
        if (!entry.startsWith(RS4IT_PREFIX)) continue;
        if (!entry.endsWith(ext)) continue;
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
}

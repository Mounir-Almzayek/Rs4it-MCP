import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadDynamicRegistry } from "../config/dynamic-config.js";

function envFlag(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(v).trim().toLowerCase());
}

function isSyncEnabled(): boolean {
  // Disable in CI or when you don't want workspace writes.
  const v = process.env["CURSOR_SYNC"];
  if (v === undefined) return true;
  return !["0", "false", "no", "off"].includes(String(v).trim().toLowerCase());
}

function safeName(input: string): string {
  return String(input)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
}

async function syncCursor(): Promise<void> {
  // Default: write into the current working directory (this repo).
  // Override: set CURSOR_TARGET_ROOT to write into another project.
  //
  // Example (PowerShell):
  //   $env:CURSOR_TARGET_ROOT="C:\\path\\to\\other-project"
  //   npm run cursor:sync-cursor
  const targetRoot = process.env["CURSOR_TARGET_ROOT"]
    ? path.resolve(process.env["CURSOR_TARGET_ROOT"])
    : process.cwd();

  const cursorDir = path.join(targetRoot, ".cursor");
  const skillsDir = path.join(cursorDir, "skills");
  const rulesDir = path.join(cursorDir, "rules");

  const clean = envFlag("CURSOR_CLEAN", false);
  if (clean) {
    await rm(skillsDir, { recursive: true, force: true });
    await rm(rulesDir, { recursive: true, force: true });
  }

  await mkdir(skillsDir, { recursive: true });
  await mkdir(rulesDir, { recursive: true });

  const registry = await loadDynamicRegistry();

  let skillsWritten = 0;
  for (const s of registry.skills.filter((x) => x.enabled)) {
    const folder = safeName(s.name) || "skill";
    const outPath = path.join(skillsDir, folder, "SKILL.md");
    const title = `# ${s.name}\n\n`;
    const desc = s.description ? `${s.description.trim()}\n\n` : "";
    const content = (title + desc + (s.instructions ?? "")).trimEnd() + "\n";
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, content, "utf-8");
    skillsWritten++;
  }

  let rulesWritten = 0;
  for (const r of registry.rules.filter((x) => x.enabled)) {
    const file = (safeName(r.name) || "rule") + ".mdc";
    const outPath = path.join(rulesDir, file);
    const title = `# ${r.name}\n\n`;
    const desc = r.description ? `${r.description.trim()}\n\n` : "";
    const content = (title + desc + (r.content ?? "")).trimEnd() + "\n";
    await writeFile(outPath, content, "utf-8");
    rulesWritten++;
  }

  process.stdout.write(
    `Synced Cursor workspace content to: ${cursorDir}\n` +
      `- skills: ${skillsWritten}\n` +
      `- rules: ${rulesWritten}\n`
  );
}

if (!isSyncEnabled()) {
  process.stdout.write("Cursor sync disabled via CURSOR_SYNC=0\n");
  process.exit(0);
}

await syncCursor();


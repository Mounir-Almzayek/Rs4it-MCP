import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadDynamicRegistry } from "../config/dynamic-config.js";

type SyncOptions = {
  pluginDir: string;
  clean: boolean;
};

function envFlag(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(v).trim().toLowerCase());
}

function isSyncEnabled(): boolean {
  // Allow disabling in CI or when you don't want workspace writes.
  // Examples:
  // - POWERSHELL: $env:CURSOR_PLUGIN_SYNC="0"
  // - CMD: set CURSOR_PLUGIN_SYNC=0
  // - bash: export CURSOR_PLUGIN_SYNC=0
  const v = process.env["CURSOR_PLUGIN_SYNC"];
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

async function exists(p: string): Promise<boolean> {
  try {
    await readdir(p);
    return true;
  } catch {
    return false;
  }
}

async function ensurePluginManifest(pluginDir: string): Promise<void> {
  const manifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  try {
    await readFile(manifestPath, "utf-8");
  } catch {
    const name = path.basename(pluginDir);
    const manifest = {
      name,
      description: "Synced from RS4IT MCP Hub dynamic registry",
      version: "0.1.0",
      author: { name: "RS4IT" },
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }
}

async function writeSkill(pluginDir: string, name: string, markdown: string): Promise<void> {
  const folder = safeName(name) || "skill";
  const outPath = path.join(pluginDir, "skills", folder, "SKILL.md");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown.trimEnd() + "\n", "utf-8");
}

async function writeRule(pluginDir: string, name: string, markdown: string): Promise<void> {
  const file = (safeName(name) || "rule") + ".mdc";
  const outPath = path.join(pluginDir, "rules", file);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown.trimEnd() + "\n", "utf-8");
}

async function copyLocalCursorSkillsAndRulesIfPresent(pluginDir: string): Promise<void> {
  const localCursorDir = path.resolve(process.cwd(), ".cursor");
  const localSkillsDir = path.join(localCursorDir, "skills");
  const localRulesDir = path.join(localCursorDir, "rules");

  if (await exists(localSkillsDir)) {
    const skillFolders = await readdir(localSkillsDir, { withFileTypes: true });
    for (const ent of skillFolders) {
      if (!ent.isDirectory()) continue;
      const p = path.join(localSkillsDir, ent.name, "SKILL.md");
      try {
        const md = await readFile(p, "utf-8");
        await writeSkill(pluginDir, ent.name, md);
      } catch {
        // ignore
      }
    }
  }

  if (await exists(localRulesDir)) {
    const ruleFiles = await readdir(localRulesDir, { withFileTypes: true });
    for (const ent of ruleFiles) {
      if (!ent.isFile()) continue;
      if (!ent.name.toLowerCase().endsWith(".mdc") && !ent.name.toLowerCase().endsWith(".md")) continue;
      const p = path.join(localRulesDir, ent.name);
      try {
        const md = await readFile(p, "utf-8");
        const base = ent.name.replace(/\.(mdc|md)$/i, "");
        await writeRule(pluginDir, base, md);
      } catch {
        // ignore
      }
    }
  }
}

async function syncPlugin({ pluginDir, clean }: SyncOptions): Promise<void> {
  const absPluginDir = path.resolve(pluginDir);

  await ensurePluginManifest(absPluginDir);

  const skillsOut = path.join(absPluginDir, "skills");
  const rulesOut = path.join(absPluginDir, "rules");
  if (clean) {
    await rm(skillsOut, { recursive: true, force: true });
    await rm(rulesOut, { recursive: true, force: true });
  }

  const registry = await loadDynamicRegistry();

  for (const s of registry.skills.filter((x) => x.enabled)) {
    const title = `# ${s.name}\n\n`;
    const desc = s.description ? `${s.description.trim()}\n\n` : "";
    await writeSkill(absPluginDir, s.name, title + desc + (s.instructions ?? ""));
  }

  for (const r of registry.rules.filter((x) => x.enabled)) {
    const title = `# ${r.name}\n\n`;
    const desc = r.description ? `${r.description.trim()}\n\n` : "";
    await writeRule(absPluginDir, r.name, title + desc + (r.content ?? ""));
  }

  // Helpful fallback: if the dynamic registry is empty (or partially filled),
  // include local workspace `.cursor` authoring so the plugin still surfaces content.
  await copyLocalCursorSkillsAndRulesIfPresent(absPluginDir);
}

const pluginDir =
  process.env["CURSOR_PLUGIN_DIR"] ??
  // Default to Cursor *local plugin* directory so skills/rules apply to all projects.
  // Windows: %USERPROFILE%\.cursor\plugins\local\rs4it-hub
  // macOS/Linux: ~/.cursor/plugins/local/rs4it-hub
  path.resolve(os.homedir(), ".cursor", "plugins", "local", "rs4it-hub");

if (!isSyncEnabled()) {
  process.stdout.write("Cursor plugin sync disabled via CURSOR_PLUGIN_SYNC=0\n");
  process.exit(0);
}

await syncPlugin({
  pluginDir,
  clean: envFlag("CURSOR_PLUGIN_CLEAN", true),
});

process.stdout.write(`Synced Cursor plugin content to: ${path.resolve(pluginDir)}\n`);


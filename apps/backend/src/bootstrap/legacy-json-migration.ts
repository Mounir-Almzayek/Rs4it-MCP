import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db/prisma.js";
import { writeRoleConfig } from "../config/roles.js";
import { writeDynamicRegistry } from "../config/dynamic-config.js";

type JsonObject = Record<string, unknown>;

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isObject(x: unknown): x is JsonObject {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export async function migrateLegacyJsonConfigIfNeeded(): Promise<{ migrated: boolean; reason?: string }> {
  const legacyDir = (process.env["MCP_LEGACY_CONFIG_DIR"] ?? "").trim();
  if (!legacyDir) return { migrated: false, reason: "MCP_LEGACY_CONFIG_DIR not set" };

  const flag = await prisma.appSetting.findUnique({ where: { key: "migratedFromJson" } });
  if (flag?.value) return { migrated: false, reason: "already migrated" };

  const dir = path.resolve(legacyDir);

  const rolesJson = await readJsonFile(path.join(dir, "roles.json"));
  if (isObject(rolesJson)) {
    const cfg = {
      defaultRole: rolesJson["defaultRole"] !== undefined ? String(rolesJson["defaultRole"] ?? "") : undefined,
      roles: Array.isArray(rolesJson["roles"]) ? (rolesJson["roles"] as any[]) : [],
    };
    await writeRoleConfig(cfg as any);
  }

  const registryJson = await readJsonFile(path.join(dir, "dynamic-registry.json"));
  if (isObject(registryJson)) {
    const reg = {
      tools: Array.isArray(registryJson["tools"]) ? registryJson["tools"] : [],
      plugins: Array.isArray(registryJson["plugins"]) ? registryJson["plugins"] : [],
      resources: Array.isArray(registryJson["resources"]) ? registryJson["resources"] : [],
      rules: Array.isArray(registryJson["rules"]) ? registryJson["rules"] : [],
    };
    await writeDynamicRegistry(reg as any);
  }

  const pluginsJson = await readJsonFile(path.join(dir, "mcp_plugins.json"));
  if (Array.isArray(pluginsJson)) {
    // Best-effort import into PluginConfig table (enabled=true by default)
    for (const p of pluginsJson) {
      if (!isObject(p)) continue;
      const id = String(p["id"] ?? "").trim();
      const name = String(p["name"] ?? "").trim();
      const command = String(p["command"] ?? "").trim();
      const args = Array.isArray(p["args"]) ? (p["args"] as unknown[]).map((a) => String(a)) : [];
      if (!id || !name || !command) continue;
      await prisma.pluginConfig.upsert({
        where: { id },
        create: {
          id,
          name,
          command,
          args: args as any,
          description: p["description"] !== undefined ? String(p["description"] ?? "") : null,
          cwd: p["cwd"] !== undefined ? String(p["cwd"] ?? "") : null,
          env: isObject(p["env"]) ? (p["env"] as any) : null,
          timeout: typeof p["timeout"] === "number" ? p["timeout"] : null,
          enabled: p["enabled"] !== false,
          allowedRoles: Array.isArray(p["allowedRoles"]) ? (p["allowedRoles"] as any) : null,
          source: String(p["source"] ?? "admin"),
          origin: p["origin"] !== undefined ? String(p["origin"] ?? "") : null,
        },
        update: {
          name,
          command,
          args: args as any,
          description: p["description"] !== undefined ? String(p["description"] ?? "") : null,
          cwd: p["cwd"] !== undefined ? String(p["cwd"] ?? "") : null,
          env: isObject(p["env"]) ? (p["env"] as any) : null,
          timeout: typeof p["timeout"] === "number" ? p["timeout"] : null,
          enabled: p["enabled"] !== false,
          allowedRoles: Array.isArray(p["allowedRoles"]) ? (p["allowedRoles"] as any) : null,
          source: String(p["source"] ?? "admin"),
          origin: p["origin"] !== undefined ? String(p["origin"] ?? "") : null,
        },
      });
    }
  }

  const credsJson = await readJsonFile(path.join(dir, "admin-credentials.json"));
  if (isObject(credsJson) && (await prisma.adminUser.count()) === 0) {
    const username = String(credsJson["username"] ?? "").trim();
    const passwordHash = String(credsJson["passwordHash"] ?? "").trim();
    if (username && passwordHash) {
      await prisma.adminUser.create({ data: { username, passwordHash } });
    }
  }

  await prisma.appSetting.upsert({
    where: { key: "migratedFromJson" },
    create: { key: "migratedFromJson", value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });

  return { migrated: true };
}


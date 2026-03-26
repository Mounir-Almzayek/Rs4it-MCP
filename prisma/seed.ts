import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";
import type { RoleConfig } from "../src/types/roles.js";
import { writeRoleConfig } from "../src/config/roles.js";
import { hash } from "bcryptjs";

async function main(): Promise<void> {
  const rolesPath = path.resolve(process.cwd(), "config", "roles.json");
  const raw = await readFile(rolesPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const cfg = parsed as RoleConfig;
  if (!cfg || typeof cfg !== "object" || !Array.isArray(cfg.roles)) {
    throw new Error(`Invalid roles config at ${rolesPath}`);
  }

  await writeRoleConfig(cfg);

  // Seed single admin user if not configured yet.
  const existingAdmin = await prisma.adminUser.findFirst();
  if (!existingAdmin) {
    const username = (process.env["ADMIN_USERNAME"] ?? "admin").trim();
    const password = process.env["ADMIN_PASSWORD"] ?? "";
    if (password && password.length >= 6) {
      const passwordHash = await hash(password, 8);
      await prisma.adminUser.create({ data: { username, passwordHash } });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


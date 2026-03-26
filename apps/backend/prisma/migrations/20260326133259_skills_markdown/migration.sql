/*
  Warnings:

  - Added the required column `content` to the `RegistrySkill` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RegistrySkill" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "definition" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RegistrySkill" ("allowedRoles", "definition", "description", "enabled", "name", "origin", "source", "updatedAt") SELECT "allowedRoles", "definition", "description", "enabled", "name", "origin", "source", "updatedAt" FROM "RegistrySkill";
DROP TABLE "RegistrySkill";
ALTER TABLE "new_RegistrySkill" RENAME TO "RegistrySkill";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

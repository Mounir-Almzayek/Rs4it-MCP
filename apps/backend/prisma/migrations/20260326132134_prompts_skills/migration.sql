-- CreateTable
CREATE TABLE "RegistryPrompt" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistrySkill" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

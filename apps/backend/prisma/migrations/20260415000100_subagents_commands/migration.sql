-- CreateTable
CREATE TABLE "RegistrySubagent" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "readonly" BOOLEAN NOT NULL DEFAULT false,
    "isBackground" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryCommand" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

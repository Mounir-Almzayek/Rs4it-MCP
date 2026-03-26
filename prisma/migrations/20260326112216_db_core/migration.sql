-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "RegistryTool" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "handlerRef" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistrySkill" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryPrompt" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "argsSchema" JSONB,
    "template" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryResource" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "uri" TEXT NOT NULL,
    "description" TEXT,
    "mimeType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryRule" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "globs" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PluginConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "description" TEXT,
    "cwd" TEXT,
    "env" JSONB,
    "timeout" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" JSONB,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "origin" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PluginStatusSnapshot" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plugins" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "McpUser" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toolName" TEXT NOT NULL,
    "userName" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "RegistryResource_uri_key" ON "RegistryResource"("uri");

-- CreateIndex
CREATE INDEX "UsageEvent_timestamp_idx" ON "UsageEvent"("timestamp");

-- CreateIndex
CREATE INDEX "UsageEvent_toolName_idx" ON "UsageEvent"("toolName");

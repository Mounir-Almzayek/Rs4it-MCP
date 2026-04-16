-- CreateTable
CREATE TABLE "SyncState" (
    "filePath" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "dbHash" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SyncState_entityType_idx" ON "SyncState"("entityType");

-- CreateTable
CREATE TABLE "InstalledPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceRepo" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InstalledPackage_type_name_key" ON "InstalledPackage"("type", "name");

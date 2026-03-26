-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoleInheritance" (
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,

    PRIMARY KEY ("childId", "parentId"),
    CONSTRAINT "RoleInheritance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleInheritance_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RoleInheritance_parentId_idx" ON "RoleInheritance"("parentId");

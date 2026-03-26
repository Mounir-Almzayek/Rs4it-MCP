-- CreateTable
CREATE TABLE "System2030Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "notificationToken" TEXT,
    "userId" INTEGER,
    "programmer" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMeAt" DATETIME,
    "lastLoginAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "System2030Session_email_key" ON "System2030Session"("email");

-- CreateIndex
CREATE INDEX "System2030Session_updatedAt_idx" ON "System2030Session"("updatedAt");

-- CreateIndex
CREATE INDEX "System2030Session_lastMeAt_idx" ON "System2030Session"("lastMeAt");

-- CreateIndex
CREATE INDEX "System2030Session_lastLoginAt_idx" ON "System2030Session"("lastLoginAt");

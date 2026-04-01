-- CreateTable
CREATE TABLE "OauthClient" (
    "clientId" TEXT NOT NULL PRIMARY KEY,
    "redirectUris" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OauthCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OauthToken" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "resetAtMs" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "t_auth_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_password_reset_code" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "t_auth_session_refreshTokenHash_key" ON "t_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "t_auth_session_userId_idx" ON "t_auth_session"("userId");

-- CreateIndex
CREATE INDEX "t_auth_session_expiresAt_idx" ON "t_auth_session"("expiresAt");

-- CreateIndex
CREATE INDEX "t_auth_session_userId_revokedAt_idx" ON "t_auth_session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "t_password_reset_code_userId_createdAt_idx" ON "t_password_reset_code"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "t_password_reset_code_expiresAt_idx" ON "t_password_reset_code"("expiresAt");

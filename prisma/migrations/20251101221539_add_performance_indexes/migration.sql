-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isPaid_idx" ON "users"("isPaid");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");

-- CreateIndex
CREATE INDEX "users_role_isPaid_idx" ON "users"("role", "isPaid");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens"("expires");

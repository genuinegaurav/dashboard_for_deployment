ALTER TABLE "User"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);

ALTER TABLE "FinancialRecord"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "User_status_role_idx" ON "User"("status", "role");
CREATE INDEX IF NOT EXISTS "FinancialRecord_createdByUserId_idx" ON "FinancialRecord"("createdByUserId");
CREATE INDEX IF NOT EXISTS "FinancialRecord_deletedAt_recordDate_idx" ON "FinancialRecord"("deletedAt", "recordDate");
CREATE INDEX IF NOT EXISTS "FinancialRecord_deletedAt_type_recordDate_idx" ON "FinancialRecord"("deletedAt", "type", "recordDate");
CREATE INDEX IF NOT EXISTS "FinancialRecord_deletedAt_category_recordDate_idx" ON "FinancialRecord"("deletedAt", "category", "recordDate");

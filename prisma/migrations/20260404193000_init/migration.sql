CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'ANALYST', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RecordType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "amountInCents" INTEGER NOT NULL,
  "type" "RecordType" NOT NULL,
  "category" TEXT NOT NULL,
  "recordDate" DATE NOT NULL,
  "notes" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "FinancialRecord_recordDate_idx" ON "FinancialRecord"("recordDate");
CREATE INDEX "FinancialRecord_category_idx" ON "FinancialRecord"("category");
CREATE INDEX "FinancialRecord_type_idx" ON "FinancialRecord"("type");
CREATE INDEX "FinancialRecord_deletedAt_idx" ON "FinancialRecord"("deletedAt");

ALTER TABLE "FinancialRecord"
ADD CONSTRAINT "FinancialRecord_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "FinancialRecord"
ADD CONSTRAINT "FinancialRecord_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

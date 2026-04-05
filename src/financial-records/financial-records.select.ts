import { Prisma } from '@prisma/client';

export const financialRecordSelect = {
  id: true,
  amountInCents: true,
  type: true,
  category: true,
  recordDate: true,
  notes: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FinancialRecordSelect;

export type FinancialRecordEntity = Prisma.FinancialRecordGetPayload<{
  select: typeof financialRecordSelect;
}>;

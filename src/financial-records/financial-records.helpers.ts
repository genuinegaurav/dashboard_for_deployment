import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DATE_ONLY_REGEX } from '../common/constants/validation.constants';
import { RecordType } from '../common/enums/record-type.enum';
import { RecordSortBy } from '../common/enums/record-sort-by.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { RecordFilterInput } from './types/record-filter-input.type';

export function normalizeCategory(category: string): string {
  return category.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeNotes(notes?: string | null): string | null {
  if (notes == null) {
    return null;
  }

  const trimmed = notes.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToAmount(amountInCents: number | null): number {
  return Number((((amountInCents ?? 0) as number) / 100).toFixed(2));
}

export function buildRecordWhereInput(filters: RecordFilterInput): Prisma.FinancialRecordWhereInput {
  const startDate = filters.startDate ? parseDateOnly(filters.startDate) : undefined;
  const endDateExclusive = filters.endDate
    ? parseExclusiveEndDate(filters.endDate)
    : undefined;

  if (startDate && endDateExclusive && startDate >= endDateExclusive) {
    throw new BadRequestException('startDate must be earlier than or equal to endDate');
  }

  return {
    deletedAt: null,
    ...(filters.type ? { type: filters.type as RecordType } : {}),
    ...(filters.category ? { category: normalizeCategory(filters.category) } : {}),
    ...(startDate || endDateExclusive
      ? {
          recordDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDateExclusive ? { lt: endDateExclusive } : {}),
          },
        }
      : {}),
  };
}

export function buildRecordSqlWhere(filters: RecordFilterInput): Prisma.Sql {
  const startDate = filters.startDate ? parseDateOnly(filters.startDate) : undefined;
  const endDateExclusive = filters.endDate
    ? parseExclusiveEndDate(filters.endDate)
    : undefined;

  if (startDate && endDateExclusive && startDate >= endDateExclusive) {
    throw new BadRequestException('startDate must be earlier than or equal to endDate');
  }

  const conditions: Prisma.Sql[] = [Prisma.sql`"deletedAt" IS NULL`];

  if (filters.type) {
    conditions.push(Prisma.sql`"type" = ${filters.type}`);
  }

  if (filters.category) {
    conditions.push(Prisma.sql`"category" = ${normalizeCategory(filters.category)}`);
  }

  if (startDate) {
    conditions.push(Prisma.sql`"recordDate" >= ${startDate}`);
  }

  if (endDateExclusive) {
    conditions.push(Prisma.sql`"recordDate" < ${endDateExclusive}`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

export function buildRecordOrderBy(
  sortBy?: RecordSortBy,
  sortOrder?: SortOrder,
): Prisma.FinancialRecordOrderByWithRelationInput[] {
  const direction = sortOrder ?? SortOrder.DESC;

  switch (sortBy) {
    case RecordSortBy.AMOUNT:
      return [{ amountInCents: direction }, { createdAt: 'desc' }];
    case RecordSortBy.CATEGORY:
      return [{ category: direction }, { createdAt: 'desc' }];
    case RecordSortBy.CREATED_AT:
      return [{ createdAt: direction }];
    case RecordSortBy.RECORD_DATE:
    default:
      return [{ recordDate: direction }, { createdAt: 'desc' }];
  }
}

export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw new BadRequestException(`Date must match YYYY-MM-DD: ${value}`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date provided: ${value}`);
  }

  return parsed;
}

export function parseExclusiveEndDate(value: string): Date {
  const parsed = parseDateOnly(value);
  parsed.setUTCDate(parsed.getUTCDate() + 1);

  return parsed;
}

export function coerceNumericValue(value: unknown): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const normalized = Number(value);

    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const normalized = Number(String(value));

    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  throw new BadRequestException('Unexpected numeric result returned from database');
}

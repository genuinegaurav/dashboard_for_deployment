import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  buildRecordSqlWhere,
  buildRecordWhereInput,
  centsToAmount,
  coerceNumericValue,
} from '../financial-records/financial-records.helpers';
import { financialRecordSelect } from '../financial-records/financial-records.select';
import { toFinancialRecordResponse } from '../financial-records/financial-records.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { RecordType } from '../common/enums/record-type.enum';
import { TrendGranularity } from '../common/enums/trend-granularity.enum';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';

interface SummaryRow {
  type: RecordType;
  total: unknown;
}

interface CategoryBreakdownRow {
  category: string;
  type: RecordType;
  total: unknown;
}

interface TrendRow {
  period: string;
  type: RecordType;
  total: unknown;
}

interface AggregateInsightRow {
  type: RecordType;
  count: unknown;
  total: unknown;
  average: unknown;
}

interface RankedCategoryRow {
  category: string;
  type: RecordType;
  total: unknown;
}

interface LargestRecordRow {
  id: string;
  category: string;
  type: RecordType;
  amountInCents: number;
  recordDate: Date;
}

@Injectable()
export class DashboardAnalyticsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(filters: DashboardFiltersDto) {
    const where = buildRecordSqlWhere(filters);
    const rows = await this.prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
      SELECT "type", COALESCE(SUM("amountInCents"), 0) AS total
      FROM "FinancialRecord"
      ${where}
      GROUP BY "type"
    `);

    const totals = rows.reduce(
      (accumulator, row) => {
        const amountInCents = coerceNumericValue(row.total);

        if (row.type === RecordType.INCOME) {
          accumulator.totalIncomeInCents += amountInCents;
        } else {
          accumulator.totalExpensesInCents += amountInCents;
        }

        return accumulator;
      },
      {
        totalIncomeInCents: 0,
        totalExpensesInCents: 0,
      },
    );

    return {
      totalIncome: centsToAmount(totals.totalIncomeInCents),
      totalExpenses: centsToAmount(totals.totalExpensesInCents),
      netBalance: centsToAmount(
        totals.totalIncomeInCents - totals.totalExpensesInCents,
      ),
    };
  }

  async getCategoryBreakdown(filters: DashboardFiltersDto) {
    const where = buildRecordSqlWhere(filters);
    const rows = await this.prisma.$queryRaw<CategoryBreakdownRow[]>(Prisma.sql`
      SELECT "category", "type", COALESCE(SUM("amountInCents"), 0) AS total
      FROM "FinancialRecord"
      ${where}
      GROUP BY "category", "type"
    `);

    const categories = new Map<
      string,
      { incomeInCents: number; expenseInCents: number }
    >();

    for (const row of rows) {
      const current = categories.get(row.category) ?? {
        incomeInCents: 0,
        expenseInCents: 0,
      };
      const amountInCents = coerceNumericValue(row.total);

      if (row.type === RecordType.INCOME) {
        current.incomeInCents += amountInCents;
      } else {
        current.expenseInCents += amountInCents;
      }

      categories.set(row.category, current);
    }

    return {
      items: Array.from(categories.entries())
        .map(([category, totals]) => ({
          category,
          income: centsToAmount(totals.incomeInCents),
          expense: centsToAmount(totals.expenseInCents),
          netBalance: centsToAmount(totals.incomeInCents - totals.expenseInCents),
        }))
        .sort((left, right) => right.netBalance - left.netBalance),
    };
  }

  async getTrends(filters: DashboardFiltersDto) {
    const granularity = filters.granularity ?? TrendGranularity.MONTH;
    const where = buildRecordSqlWhere(filters);
    const periodExpression =
      granularity === TrendGranularity.MONTH
        ? Prisma.sql`TO_CHAR(DATE_TRUNC('month', "recordDate"::timestamp), 'YYYY-MM')`
        : Prisma.sql`TO_CHAR(DATE_TRUNC('week', "recordDate"::timestamp), 'YYYY-MM-DD')`;

    const rows = await this.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      SELECT ${periodExpression} AS period, "type", COALESCE(SUM("amountInCents"), 0) AS total
      FROM "FinancialRecord"
      ${where}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `);

    const periods = new Map<
      string,
      { incomeInCents: number; expenseInCents: number }
    >();

    for (const row of rows) {
      const current = periods.get(row.period) ?? {
        incomeInCents: 0,
        expenseInCents: 0,
      };
      const amountInCents = coerceNumericValue(row.total);

      if (row.type === RecordType.INCOME) {
        current.incomeInCents += amountInCents;
      } else {
        current.expenseInCents += amountInCents;
      }

      periods.set(row.period, current);
    }

    return {
      granularity,
      items: Array.from(periods.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([period, totals]) => ({
          period,
          income: centsToAmount(totals.incomeInCents),
          expense: centsToAmount(totals.expenseInCents),
          netBalance: centsToAmount(totals.incomeInCents - totals.expenseInCents),
        })),
    };
  }

  async getRecentActivity(filters: DashboardFiltersDto) {
    const limit = filters.limit ?? 10;
    const items = await this.prisma.financialRecord.findMany({
      where: buildRecordWhereInput(filters),
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: financialRecordSelect,
    });

    return {
      limit,
      items: items.map(toFinancialRecordResponse),
    };
  }

  async getAdvancedInsights(filters: DashboardFiltersDto) {
    const where = buildRecordSqlWhere(filters);
    const [aggregateRows, rankedCategoryRows, largestExpenseRows, largestIncomeRows] =
      await Promise.all([
        this.prisma.$queryRaw<AggregateInsightRow[]>(Prisma.sql`
          SELECT
            "type",
            COUNT(*)::int AS count,
            COALESCE(SUM("amountInCents"), 0)::bigint AS total,
            COALESCE(AVG("amountInCents"), 0)::double precision AS average
          FROM "FinancialRecord"
          ${where}
          GROUP BY "type"
        `),
        this.prisma.$queryRaw<RankedCategoryRow[]>(Prisma.sql`
          SELECT "category", "type", COALESCE(SUM("amountInCents"), 0)::bigint AS total
          FROM "FinancialRecord"
          ${where}
          GROUP BY "category", "type"
          ORDER BY total DESC
        `),
        this.prisma.$queryRaw<LargestRecordRow[]>(Prisma.sql`
          SELECT "id", "category", "type", "amountInCents", "recordDate"
          FROM "FinancialRecord"
          ${where}
          AND "type" = CAST(${RecordType.EXPENSE} AS "RecordType")
          ORDER BY "amountInCents" DESC, "recordDate" DESC
          LIMIT 1
        `),
        this.prisma.$queryRaw<LargestRecordRow[]>(Prisma.sql`
          SELECT "id", "category", "type", "amountInCents", "recordDate"
          FROM "FinancialRecord"
          ${where}
          AND "type" = CAST(${RecordType.INCOME} AS "RecordType")
          ORDER BY "amountInCents" DESC, "recordDate" DESC
          LIMIT 1
        `),
      ]);

    const rollup = aggregateRows.reduce(
      (accumulator, row) => {
        const count = coerceNumericValue(row.count);
        const totalInCents = coerceNumericValue(row.total);
        const averageInCents = coerceNumericValue(row.average);

        if (row.type === RecordType.INCOME) {
          accumulator.incomeCount = count;
          accumulator.incomeTotalInCents = totalInCents;
          accumulator.averageIncomeInCents = averageInCents;
        } else {
          accumulator.expenseCount = count;
          accumulator.expenseTotalInCents = totalInCents;
          accumulator.averageExpenseInCents = averageInCents;
        }

        return accumulator;
      },
      {
        incomeCount: 0,
        expenseCount: 0,
        incomeTotalInCents: 0,
        expenseTotalInCents: 0,
        averageIncomeInCents: 0,
        averageExpenseInCents: 0,
      },
    );

    const topIncomeCategories = rankedCategoryRows
      .filter((row) => row.type === RecordType.INCOME)
      .slice(0, 5)
      .map((row) => ({
        category: row.category,
        total: centsToAmount(coerceNumericValue(row.total)),
      }));

    const topExpenseCategories = rankedCategoryRows
      .filter((row) => row.type === RecordType.EXPENSE)
      .slice(0, 5)
      .map((row) => ({
        category: row.category,
        total: centsToAmount(coerceNumericValue(row.total)),
      }));

    const savingsRate =
      rollup.incomeTotalInCents > 0
        ? Number(
            (
              ((rollup.incomeTotalInCents - rollup.expenseTotalInCents) /
                rollup.incomeTotalInCents) *
              100
            ).toFixed(2),
          )
        : null;

    const expenseToIncomeRatio =
      rollup.incomeTotalInCents > 0
        ? Number(
            (rollup.expenseTotalInCents / rollup.incomeTotalInCents).toFixed(2),
          )
        : null;

    return {
      incomeRecordCount: rollup.incomeCount,
      expenseRecordCount: rollup.expenseCount,
      averageIncomeTransaction: centsToAmount(rollup.averageIncomeInCents),
      averageExpenseTransaction: centsToAmount(rollup.averageExpenseInCents),
      savingsRate,
      expenseToIncomeRatio,
      largestIncome: largestIncomeRows[0]
        ? {
            id: largestIncomeRows[0].id,
            category: largestIncomeRows[0].category,
            amount: centsToAmount(largestIncomeRows[0].amountInCents),
            recordDate: largestIncomeRows[0].recordDate,
          }
        : null,
      largestExpense: largestExpenseRows[0]
        ? {
            id: largestExpenseRows[0].id,
            category: largestExpenseRows[0].category,
            amount: centsToAmount(largestExpenseRows[0].amountInCents),
            recordDate: largestExpenseRows[0].recordDate,
          }
        : null,
      topIncomeCategories,
      topExpenseCategories,
    };
  }
}

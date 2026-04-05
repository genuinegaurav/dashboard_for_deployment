'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularity, setGranularity] = useState<'month' | 'week'>('month');
  const canAccessAdvancedInsights = user?.role === 'ANALYST' || user?.role === 'ADMIN';

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', filters],
    queryFn: () => dashboardApi.getSummary(filters),
  });
  const categoryQuery = useQuery({
    queryKey: ['dashboard', 'category-breakdown', filters],
    queryFn: () => dashboardApi.getCategoryBreakdown(filters),
  });
  const advancedInsightsQuery = useQuery({
    queryKey: ['dashboard', 'advanced-insights', filters],
    queryFn: () => dashboardApi.getAdvancedInsights(filters),
    enabled: canAccessAdvancedInsights,
  });
  const trendsQuery = useQuery({
    queryKey: ['dashboard', 'trends', filters, granularity],
    queryFn: () => dashboardApi.getTrends({ ...filters, granularity }),
  });
  const activityQuery = useQuery({
    queryKey: ['dashboard', 'recent-activity', filters],
    queryFn: () => dashboardApi.getRecentActivity({ ...filters, limit: 6 }),
  });

  const isLoading =
    summaryQuery.isLoading ||
    categoryQuery.isLoading ||
    trendsQuery.isLoading ||
    activityQuery.isLoading ||
    (canAccessAdvancedInsights ? advancedInsightsQuery.isLoading : false);
  const hasError =
    summaryQuery.error ||
    categoryQuery.error ||
    trendsQuery.error ||
    activityQuery.error ||
    (canAccessAdvancedInsights ? advancedInsightsQuery.error : null);

  return (
    <AppShell
      title="Dashboard"
      description="Use the summary, breakdown, and trend panels to validate that your backend analytics stay consistent while you switch roles, filters, and records."
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dashboard-start-date">Start date</Label>
              <Input
                id="dashboard-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-end-date">End date</Label>
              <Input
                id="dashboard-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-granularity">Trend granularity</Label>
              <Select
                id="dashboard-granularity"
                value={granularity}
                onChange={(event) => setGranularity(event.target.value as 'month' | 'week')}
              >
                <option value="month">Month</option>
                <option value="week">Week</option>
              </Select>
            </div>
          </div>
        </Card>

        {hasError ? (
          <Card className="border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load dashboard data. Make sure the backend is running and your session is
            still valid.
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total income"
            value={summaryQuery.data ? formatCurrency(summaryQuery.data.totalIncome) : '...'}
            tone="income"
          />
          <MetricCard
            label="Total expenses"
            value={summaryQuery.data ? formatCurrency(summaryQuery.data.totalExpenses) : '...'}
            tone="expense"
          />
          <MetricCard
            label="Net balance"
            value={summaryQuery.data ? formatCurrency(summaryQuery.data.netBalance) : '...'}
            tone="balance"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-950">Category breakdown</h3>
              <p className="mt-1 text-sm text-slate-600">
                Confirms grouped totals for income, expense, and net balance.
              </p>
            </div>
            <div className="h-[320px]">
              {isLoading ? (
                <ChartPlaceholder />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryQuery.data?.items ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-950">Recent activity</h3>
              <p className="mt-1 text-sm text-slate-600">
                Fast way to verify record ordering and date normalization.
              </p>
            </div>
            <div className="space-y-3">
              {activityQuery.data?.items.length ? (
                activityQuery.data.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.category}</p>
                        <p className="text-sm text-slate-500">{item.notes || 'No notes'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                        <p className="text-sm text-slate-500">{formatDate(item.recordDate)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  {isLoading ? 'Loading activity...' : 'No recent activity for the selected range.'}
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950">Trends</h3>
            <p className="mt-1 text-sm text-slate-600">
              Useful for checking monthly or weekly rollups after creating or deleting records.
            </p>
          </div>
          <div className="h-[320px]">
            {isLoading ? (
              <ChartPlaceholder />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsQuery.data?.items ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netBalance"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {canAccessAdvancedInsights ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-950">Advanced insights</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Analyst-grade metrics for testing reporting depth beyond the base dashboard.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InsightMetric
                  label="Savings rate"
                  value={formatPercent(advancedInsightsQuery.data?.savingsRate)}
                />
                <InsightMetric
                  label="Expense / income ratio"
                  value={formatRatio(advancedInsightsQuery.data?.expenseToIncomeRatio)}
                />
                <InsightMetric
                  label="Avg income transaction"
                  value={formatCurrency(
                    advancedInsightsQuery.data?.averageIncomeTransaction ?? 0,
                  )}
                />
                <InsightMetric
                  label="Avg expense transaction"
                  value={formatCurrency(
                    advancedInsightsQuery.data?.averageExpenseTransaction ?? 0,
                  )}
                />
                <InsightMetric
                  label="Income entries"
                  value={String(advancedInsightsQuery.data?.incomeRecordCount ?? 0)}
                />
                <InsightMetric
                  label="Expense entries"
                  value={String(advancedInsightsQuery.data?.expenseRecordCount ?? 0)}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-950">Largest movements</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Useful for validating ranking logic and analyst-only reporting access.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InsightHighlight
                  title="Largest income"
                  item={advancedInsightsQuery.data?.largestIncome ?? null}
                />
                <InsightHighlight
                  title="Largest expense"
                  item={advancedInsightsQuery.data?.largestExpense ?? null}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <CategoryRanking
                  title="Top income categories"
                  items={advancedInsightsQuery.data?.topIncomeCategories ?? []}
                />
                <CategoryRanking
                  title="Top expense categories"
                  items={advancedInsightsQuery.data?.topExpenseCategories ?? []}
                />
              </div>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed p-5">
            <h3 className="text-lg font-semibold text-slate-950">Advanced insights</h3>
            <p className="mt-2 text-sm text-slate-600">
              Analysts and admins can access richer reporting metrics and export flows. Viewers stay
              limited to the core dashboard and record drill-down experience.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'balance';
}) {
  const toneStyles = {
    income: 'from-teal-500/15 to-teal-500/5 text-teal-900',
    expense: 'from-amber-500/15 to-amber-500/5 text-amber-900',
    balance: 'from-slate-900/15 to-slate-900/5 text-slate-900',
  };

  return (
    <Card className={`bg-gradient-to-br ${toneStyles[tone]} p-5`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 px-4 py-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InsightHighlight({
  title,
  item,
}: {
  title: string;
  item:
    | {
        category: string;
        amount: number;
        recordDate: string;
      }
    | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 px-4 py-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {item ? (
        <div className="mt-3 space-y-1">
          <p className="text-lg font-semibold text-slate-950">{item.category}</p>
          <p className="text-sm text-slate-600">{formatCurrency(item.amount)}</p>
          <p className="text-sm text-slate-500">{formatDate(item.recordDate)}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No matching records for the selected filters.</p>
      )}
    </div>
  );
}

function CategoryRanking({
  title,
  items,
}: {
  title: string;
  items: Array<{ category: string; total: number }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h4 className="font-semibold text-slate-950">{title}</h4>
      </div>
      <div className="space-y-2 px-4 py-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item.category}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">{item.category}</span>
              <span className="font-semibold text-slate-950">{formatCurrency(item.total)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No ranked categories for the current filter set.</p>
        )}
      </div>
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return 'n/a';
  }

  return `${value.toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null) {
    return 'n/a';
  }

  return `${value.toFixed(2)}x`;
}

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border bg-slate-50 text-sm text-slate-500">
      Loading chart data...
    </div>
  );
}

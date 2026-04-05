export type UserRole = 'VIEWER' | 'ANALYST' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RecordType = 'INCOME' | 'EXPENSE';
export type TrendGranularity = 'month' | 'week';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
}

export interface FinancialRecord {
  id: string;
  amount: number;
  type: RecordType;
  category: string;
  recordDate: string;
  notes: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export interface InsightRecordHighlight {
  id: string;
  category: string;
  amount: number;
  recordDate: string;
}

export interface InsightCategoryTotal {
  category: string;
  total: number;
}

export interface AdvancedInsights {
  incomeRecordCount: number;
  expenseRecordCount: number;
  averageIncomeTransaction: number;
  averageExpenseTransaction: number;
  savingsRate: number | null;
  expenseToIncomeRatio: number | null;
  largestIncome: InsightRecordHighlight | null;
  largestExpense: InsightRecordHighlight | null;
  topIncomeCategories: InsightCategoryTotal[];
  topExpenseCategories: InsightCategoryTotal[];
}

export interface CategoryBreakdownItem {
  category: string;
  income: number;
  expense: number;
  netBalance: number;
}

export interface CategoryBreakdownResponse {
  items: CategoryBreakdownItem[];
}

export interface TrendItem {
  period: string;
  income: number;
  expense: number;
  netBalance: number;
}

export interface TrendResponse {
  granularity: TrendGranularity;
  items: TrendItem[];
}

export interface RecentActivityResponse {
  limit: number;
  items: FinancialRecord[];
}

export interface RecordFilters {
  category?: string;
  type?: RecordType | '';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  granularity?: TrendGranularity;
  limit?: number;
}

export interface CreateRecordInput {
  amount: number;
  type: RecordType;
  category: string;
  recordDate: string;
  notes?: string;
}

export type UpdateRecordInput = Partial<CreateRecordInput>;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

import {
  AdvancedInsights,
  CategoryBreakdownResponse,
  CreateRecordInput,
  CreateUserInput,
  DashboardFilters,
  DashboardSummary,
  FinancialRecord,
  LoginResponse,
  PaginatedResponse,
  RecentActivityResponse,
  RecordFilters,
  TrendResponse,
  UpdateRecordInput,
  UpdateUserInput,
  User,
} from '@/lib/types';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { query?: object } = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const queryString = buildQueryString(options.query);
  const url = `${API_BASE_URL}${path}${queryString}`;

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue('fd_csrf_token');

    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(payload), response.status, payload);
  }

  return payload as T;
}

export const authApi = {
  login(email: string, password: string) {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return apiFetch<User>('/auth/me');
  },
  refresh() {
    return apiFetch<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
  },
  logout() {
    return apiFetch<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};

export const dashboardApi = {
  getSummary(filters: DashboardFilters) {
    return apiFetch<DashboardSummary>('/dashboard/summary', {
      query: filters,
    });
  },
  getAdvancedInsights(filters: DashboardFilters) {
    return apiFetch<AdvancedInsights>('/dashboard/advanced-insights', {
      query: filters,
    });
  },
  getCategoryBreakdown(filters: DashboardFilters) {
    return apiFetch<CategoryBreakdownResponse>('/dashboard/category-breakdown', {
      query: filters,
    });
  },
  getTrends(filters: DashboardFilters) {
    return apiFetch<TrendResponse>('/dashboard/trends', {
      query: filters,
    });
  },
  getRecentActivity(filters: DashboardFilters) {
    return apiFetch<RecentActivityResponse>('/dashboard/recent-activity', {
      query: filters,
    });
  },
};

export const recordsApi = {
  list(filters: RecordFilters) {
    return apiFetch<PaginatedResponse<FinancialRecord>>('/records', {
      query: filters,
    });
  },
  create(input: CreateRecordInput) {
    return apiFetch<FinancialRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: UpdateRecordInput) {
    return apiFetch<FinancialRecord>(`/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  remove(id: string) {
    return apiFetch<void>(`/records/${id}`, {
      method: 'DELETE',
    });
  },
};

export const usersApi = {
  list() {
    return apiFetch<User[]>('/users');
  },
  create(input: CreateUserInput) {
    return apiFetch<User>('/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: UpdateUserInput) {
    return apiFetch<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  updateStatus(id: string, status: User['status']) {
    return apiFetch<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

function buildQueryString(query?: object) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value));
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

function resolveErrorMessage(payload: unknown) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Request failed';
}

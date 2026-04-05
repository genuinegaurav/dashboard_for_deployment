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

/* ------------------------------------------------------------------ */
/*  Token helpers (localStorage)                                       */
/* ------------------------------------------------------------------ */

const ACCESS_TOKEN_KEY = 'fd_access_token';
const REFRESH_TOKEN_KEY = 'fd_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Error class                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Core fetch wrapper                                                 */
/* ------------------------------------------------------------------ */

let isRefreshing = false;
let refreshPromise: Promise<LoginResponse | null> | null = null;

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { query?: object; _isRetry?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const queryString = buildQueryString(options.query);
  const url = `${API_BASE_URL}${path}${queryString}`;

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject bearer token if available
  const accessToken = getAccessToken();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    // Only send cookies when no bearer token (local dev / Swagger fallback)
    credentials: accessToken ? 'omit' : 'include',
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
    // 401 auto-refresh-and-retry (only once, only if we have a refresh token)
    if (
      response.status === 401 &&
      !options._isRetry &&
      getRefreshToken() &&
      !path.startsWith('/auth/')
    ) {
      const refreshed = await tryRefreshToken();

      if (refreshed) {
        return apiFetch<T>(path, { ...options, _isRetry: true });
      }
    }

    throw new ApiError(resolveErrorMessage(payload), response.status, payload);
  }

  return payload as T;
}

/* ------------------------------------------------------------------ */
/*  Auto-refresh helper (coalesces concurrent calls)                   */
/* ------------------------------------------------------------------ */

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    const result = await refreshPromise;
    return result !== null;
  }

  isRefreshing = true;

  refreshPromise = (async (): Promise<LoginResponse | null> => {
    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'omit',
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data: LoginResponse = await res.json();

      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        return data;
      }

      clearTokens();
      return null;
    } catch {
      clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  const result = await refreshPromise;
  return result !== null;
}

/* ------------------------------------------------------------------ */
/*  Auth API                                                           */
/* ------------------------------------------------------------------ */

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiFetch<LoginResponse>('/auth/login?responseMode=bearer', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.accessToken && response.refreshToken) {
      setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },

  me() {
    return apiFetch<User>('/auth/me');
  },

  async refresh(): Promise<LoginResponse> {
    const refreshToken = getRefreshToken();

    const response = await apiFetch<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });

    if (response.accessToken && response.refreshToken) {
      setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },

  async logout(): Promise<{ success: boolean }> {
    const refreshToken = getRefreshToken();

    try {
      return await apiFetch<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshToken || undefined }),
      });
    } finally {
      clearTokens();
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Domain APIs (unchanged)                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

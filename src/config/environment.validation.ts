export type AppEnvironment = 'development' | 'test' | 'staging' | 'production';
export type AppLogLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';
export type AppCookieSameSite = 'lax' | 'strict' | 'none';

export interface ValidatedEnvironment {
  NODE_ENV: AppEnvironment;
  PORT: number;
  DATABASE_URL: string;
  DIRECT_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  CORS_ORIGINS: string;
  LOG_LEVEL: AppLogLevel;
  SWAGGER_ENABLED: boolean;
  BCRYPT_ROUNDS: number;
  COOKIE_NAME: string;
  REFRESH_COOKIE_NAME: string;
  CSRF_COOKIE_NAME: string;
  COOKIE_SECURE: boolean;
  COOKIE_SAME_SITE: AppCookieSameSite;
  COOKIE_DOMAIN?: string;
}

const ALLOWED_ENVIRONMENTS = new Set<AppEnvironment>([
  'development',
  'test',
  'staging',
  'production',
]);
const ALLOWED_LOG_LEVELS = new Set<AppLogLevel>([
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
]);
const ALLOWED_COOKIE_SAME_SITE = new Set<AppCookieSameSite>([
  'lax',
  'strict',
  'none',
]);
const PLACEHOLDER_PATTERN = /__REPLACE_ME/i;

export function resolveEnvironmentFilePaths(nodeEnv?: string): string[] {
  const environment = nodeEnv?.trim() || 'development';

  return [
    `.env.${environment}.local`,
    `.env.${environment}`,
    '.env.local',
    '.env',
  ];
}

export function validateEnvironment(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  const nodeEnv = coerceString(config.NODE_ENV) || 'development';

  if (!ALLOWED_ENVIRONMENTS.has(nodeEnv as AppEnvironment)) {
    throw new Error(
      `NODE_ENV must be one of: ${Array.from(ALLOWED_ENVIRONMENTS).join(', ')}`,
    );
  }

  const isLocalLike = nodeEnv === 'development' || nodeEnv === 'test';
  const port = coerceNumber(config.PORT, 3000, 'PORT', 1, 65535);
  const databaseUrl = requireString(config.DATABASE_URL, 'DATABASE_URL');
  const directUrl = requireString(config.DIRECT_URL, 'DIRECT_URL');
  const jwtSecret = requireString(config.JWT_SECRET, 'JWT_SECRET');
  const jwtExpiresIn = coerceString(config.JWT_EXPIRES_IN) || '15m';
  const refreshTokenSecret =
    coerceString(config.REFRESH_TOKEN_SECRET) ||
    (isLocalLike ? jwtSecret : requireString(config.REFRESH_TOKEN_SECRET, 'REFRESH_TOKEN_SECRET'));
  const refreshTokenExpiresIn =
    coerceString(config.REFRESH_TOKEN_EXPIRES_IN) || '7d';
  const corsOrigins =
    coerceString(config.CORS_ORIGINS) ||
    (isLocalLike ? 'http://localhost:3000,http://localhost:3001,http://localhost:5173' : '');
  const logLevel = (coerceString(config.LOG_LEVEL) ||
    (nodeEnv === 'test' ? 'error' : 'log')) as AppLogLevel;
  const swaggerEnabled = coerceBoolean(config.SWAGGER_ENABLED, isLocalLike);
  const bcryptRounds = coerceNumber(
    config.BCRYPT_ROUNDS,
    isLocalLike ? 10 : 12,
    'BCRYPT_ROUNDS',
    4,
    15,
  );
  const cookieName = coerceString(config.COOKIE_NAME) || 'fd_access_token';
  const refreshCookieName =
    coerceString(config.REFRESH_COOKIE_NAME) || 'fd_refresh_token';
  const csrfCookieName = coerceString(config.CSRF_COOKIE_NAME) || 'fd_csrf_token';
  const cookieSecure = coerceBoolean(config.COOKIE_SECURE, !isLocalLike);
  const cookieSameSite = (coerceString(config.COOKIE_SAME_SITE) ||
    (isLocalLike ? 'lax' : 'none')) as AppCookieSameSite;
  const cookieDomain = coerceString(config.COOKIE_DOMAIN);

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use a PostgreSQL connection string');
  }

  if (!directUrl.startsWith('postgresql://') && !directUrl.startsWith('postgres://')) {
    throw new Error('DIRECT_URL must use a PostgreSQL connection string');
  }

  if (!ALLOWED_LOG_LEVELS.has(logLevel)) {
    throw new Error(
      `LOG_LEVEL must be one of: ${Array.from(ALLOWED_LOG_LEVELS).join(', ')}`,
    );
  }

  if (!ALLOWED_COOKIE_SAME_SITE.has(cookieSameSite)) {
    throw new Error(
      `COOKIE_SAME_SITE must be one of: ${Array.from(ALLOWED_COOKIE_SAME_SITE).join(', ')}`,
    );
  }

  if (!corsOrigins) {
    throw new Error('CORS_ORIGINS must be provided');
  }

  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is "none"');
  }

  if (!isLocalLike) {
    rejectPlaceholders(databaseUrl, 'DATABASE_URL');
    rejectPlaceholders(directUrl, 'DIRECT_URL');
    rejectPlaceholders(jwtSecret, 'JWT_SECRET');
    rejectPlaceholders(refreshTokenSecret, 'REFRESH_TOKEN_SECRET');
    rejectPlaceholders(corsOrigins, 'CORS_ORIGINS');

    if (cookieDomain) {
      rejectPlaceholders(cookieDomain, 'COOKIE_DOMAIN');
    }

    if (corsOrigins.includes('*')) {
      throw new Error('CORS_ORIGINS cannot contain "*" outside local or test environments');
    }
  }

  return {
    NODE_ENV: nodeEnv as AppEnvironment,
    PORT: port,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    REFRESH_TOKEN_SECRET: refreshTokenSecret,
    REFRESH_TOKEN_EXPIRES_IN: refreshTokenExpiresIn,
    CORS_ORIGINS: corsOrigins,
    LOG_LEVEL: logLevel,
    SWAGGER_ENABLED: swaggerEnabled,
    BCRYPT_ROUNDS: bcryptRounds,
    COOKIE_NAME: cookieName,
    REFRESH_COOKIE_NAME: refreshCookieName,
    CSRF_COOKIE_NAME: csrfCookieName,
    COOKIE_SECURE: cookieSecure,
    COOKIE_SAME_SITE: cookieSameSite,
    COOKIE_DOMAIN: cookieDomain,
  };
}

function requireString(value: unknown, key: string): string {
  const normalized = coerceString(value);

  if (!normalized) {
    throw new Error(`${key} is required`);
  }

  return normalized;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function coerceBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error('SWAGGER_ENABLED must be either "true" or "false"');
}

function coerceNumber(
  value: unknown,
  defaultValue: number,
  key: string,
  min: number,
  max: number,
): number {
  const normalized = typeof value === 'number' ? value : Number(value ?? defaultValue);

  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }

  return normalized;
}

function rejectPlaceholders(value: string, key: string) {
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${key} cannot use a placeholder value outside local or test environments`);
  }
}

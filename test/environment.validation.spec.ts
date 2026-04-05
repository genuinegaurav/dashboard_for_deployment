import { validateEnvironment } from '../src/config/environment.validation';

describe('environment validation', () => {
  it('accepts a valid production configuration', () => {
    const validated = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
      DIRECT_URL: 'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
      JWT_SECRET: 'StrongProductionSecret123!',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_SECRET: 'StrongRefreshSecret123!',
      REFRESH_TOKEN_EXPIRES_IN: '7d',
      CORS_ORIGINS: 'https://dashboard.example.com',
      LOG_LEVEL: 'log',
      SWAGGER_ENABLED: 'false',
      BCRYPT_ROUNDS: '12',
      COOKIE_NAME: 'fd_access_token',
      REFRESH_COOKIE_NAME: 'fd_refresh_token',
      CSRF_COOKIE_NAME: 'fd_csrf_token',
      COOKIE_SECURE: 'true',
      COOKIE_SAME_SITE: 'none',
    });

    expect(validated.NODE_ENV).toBe('production');
    expect(validated.SWAGGER_ENABLED).toBe(false);
    expect(validated.BCRYPT_ROUNDS).toBe(12);
    expect(validated.REFRESH_COOKIE_NAME).toBe('fd_refresh_token');
  });

  it('rejects placeholder production secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL:
          'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
        DIRECT_URL:
          'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
        JWT_SECRET: '__REPLACE_ME_STRONG_SECRET__',
        REFRESH_TOKEN_SECRET: '__REPLACE_ME_REFRESH_SECRET__',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        CORS_ORIGINS: 'https://dashboard.example.com',
        LOG_LEVEL: 'log',
        SWAGGER_ENABLED: 'false',
        BCRYPT_ROUNDS: '12',
        COOKIE_NAME: 'fd_access_token',
        REFRESH_COOKIE_NAME: 'fd_refresh_token',
        CSRF_COOKIE_NAME: 'fd_csrf_token',
        COOKIE_SECURE: 'true',
        COOKIE_SAME_SITE: 'none',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects wildcard origins outside local environments', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'staging',
        PORT: '3000',
        DATABASE_URL:
          'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
        DIRECT_URL:
          'postgresql://user:password@db.example.com:5432/finance_dashboard?schema=public',
        JWT_SECRET: 'StrongStagingSecret123!',
        REFRESH_TOKEN_SECRET: 'StrongRefreshSecret123!',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        CORS_ORIGINS: '*',
        LOG_LEVEL: 'log',
        SWAGGER_ENABLED: 'false',
        BCRYPT_ROUNDS: '12',
        COOKIE_NAME: 'fd_access_token',
        REFRESH_COOKIE_NAME: 'fd_refresh_token',
        CSRF_COOKIE_NAME: 'fd_csrf_token',
        COOKIE_SECURE: 'true',
        COOKIE_SAME_SITE: 'none',
      }),
    ).toThrow(/CORS_ORIGINS/);
  });

  it('provides safe defaults for development', () => {
    const validated = validateEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/finance_dashboard_dev?schema=public',
      DIRECT_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/finance_dashboard_dev?schema=public',
      JWT_SECRET: 'local-development-secret-change-me',
    });

    expect(validated.PORT).toBe(3000);
    expect(validated.SWAGGER_ENABLED).toBe(true);
    expect(validated.CORS_ORIGINS).toContain('http://localhost:3000');
    expect(validated.CORS_ORIGINS).toContain('http://localhost:3001');
    expect(validated.COOKIE_NAME).toBe('fd_access_token');
    expect(validated.REFRESH_TOKEN_SECRET).toBe('local-development-secret-change-me');
    expect(validated.REFRESH_COOKIE_NAME).toBe('fd_refresh_token');
  });
});

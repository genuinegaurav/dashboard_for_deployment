import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AppCookieSameSite,
  AppEnvironment,
  AppLogLevel,
  ValidatedEnvironment,
} from './environment.validation';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<ValidatedEnvironment, true>) {}

  get nodeEnv(): AppEnvironment {
    return this.configService.getOrThrow('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isStaging(): boolean {
    return this.nodeEnv === 'staging';
  }

  get isLocalLike(): boolean {
    return this.nodeEnv === 'development' || this.nodeEnv === 'test';
  }

  get port(): number {
    return this.configService.getOrThrow('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow('DATABASE_URL', { infer: true });
  }

  get directUrl(): string {
    return this.configService.getOrThrow('DIRECT_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.getOrThrow('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.getOrThrow('JWT_EXPIRES_IN', { infer: true });
  }

  get refreshTokenSecret(): string {
    return this.configService.getOrThrow('REFRESH_TOKEN_SECRET', { infer: true });
  }

  get refreshTokenExpiresIn(): string {
    return this.configService.getOrThrow('REFRESH_TOKEN_EXPIRES_IN', {
      infer: true,
    });
  }

  get corsOrigins(): string[] {
    const origins = this.configService.getOrThrow('CORS_ORIGINS', { infer: true });

    return origins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get logLevel(): AppLogLevel {
    return this.configService.getOrThrow('LOG_LEVEL', { infer: true });
  }

  get swaggerEnabled(): boolean {
    return this.configService.getOrThrow('SWAGGER_ENABLED', { infer: true });
  }

  get bcryptRounds(): number {
    return this.configService.getOrThrow('BCRYPT_ROUNDS', { infer: true });
  }

  get cookieName(): string {
    return this.configService.getOrThrow('COOKIE_NAME', { infer: true });
  }

  get refreshCookieName(): string {
    return this.configService.getOrThrow('REFRESH_COOKIE_NAME', { infer: true });
  }

  get csrfCookieName(): string {
    return this.configService.getOrThrow('CSRF_COOKIE_NAME', { infer: true });
  }

  get cookieSecure(): boolean {
    return this.configService.getOrThrow('COOKIE_SECURE', { infer: true });
  }

  get cookieSameSite(): AppCookieSameSite {
    return this.configService.getOrThrow('COOKIE_SAME_SITE', { infer: true });
  }

  get cookieDomain(): string | undefined {
    return this.configService.get('COOKIE_DOMAIN', { infer: true });
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { AppConfigService } from '../../config/app-config.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/auth/login', '/auth/logout']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly appConfigService: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const path = request.path || request.url;

    if (EXEMPT_PATHS.has(path)) {
      return true;
    }

    const authorizationHeader = request.header('authorization')?.trim();

    if (authorizationHeader?.toLowerCase().startsWith('bearer ')) {
      return true;
    }

    const accessTokenCookie = request.cookies?.[this.appConfigService.cookieName];
    const refreshTokenCookie = request.cookies?.[this.appConfigService.refreshCookieName];

    if (!accessTokenCookie && !refreshTokenCookie) {
      return true;
    }

    const csrfCookie = request.cookies?.[this.appConfigService.csrfCookieName];
    const csrfHeader = request.header('x-csrf-token')?.trim();

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('CSRF token is missing or invalid');
    }

    return true;
  }
}

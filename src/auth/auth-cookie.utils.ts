import { randomBytes } from 'node:crypto';

import { CookieOptions, Response } from 'express';

import { AppConfigService } from '../config/app-config.service';

export function createCsrfToken(): string {
  return randomBytes(24).toString('hex');
}

export function setAuthCookies(
  response: Response,
  appConfigService: AppConfigService,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
) {
  response.cookie(
    appConfigService.cookieName,
    accessToken,
    buildCookieOptions(appConfigService, {
      httpOnly: true,
    }),
  );
  response.cookie(
    appConfigService.refreshCookieName,
    refreshToken,
    buildCookieOptions(appConfigService, {
      httpOnly: true,
    }),
  );
  response.cookie(
    appConfigService.csrfCookieName,
    csrfToken,
    buildCookieOptions(appConfigService, {
      httpOnly: false,
    }),
  );
}

export function clearAuthCookies(
  response: Response,
  appConfigService: AppConfigService,
) {
  const options = buildCookieOptions(appConfigService, {
    httpOnly: true,
  });
  const csrfOptions = buildCookieOptions(appConfigService, {
    httpOnly: false,
  });

  response.clearCookie(appConfigService.cookieName, options);
  response.clearCookie(appConfigService.refreshCookieName, options);
  response.clearCookie(appConfigService.csrfCookieName, csrfOptions);
}

function buildCookieOptions(
  appConfigService: AppConfigService,
  overrides: Pick<CookieOptions, 'httpOnly'>,
): CookieOptions {
  return {
    domain: appConfigService.cookieDomain,
    httpOnly: overrides.httpOnly,
    path: '/',
    sameSite: appConfigService.cookieSameSite,
    secure: appConfigService.cookieSecure,
  };
}

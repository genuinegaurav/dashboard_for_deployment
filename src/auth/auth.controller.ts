import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AppConfigService } from '../config/app-config.service';
import { clearAuthCookies, createCsrfToken, setAuthCookies } from './auth-cookie.utils';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthResponseMode, LoginQueryDto } from './dto/login-query.dto';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSessionService: AuthSessionService,
    private readonly appConfigService: AppConfigService,
  ) { }

  @Post('login')
  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an active user, set session cookies, and issue a JWT.' })
  @ApiQuery({
    name: 'responseMode',
    required: false,
    enum: AuthResponseMode,
    description:
      'Use "bearer" only for explicit development or test flows that need the raw access token.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Query() loginQueryDto: LoginQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateCredentials(loginDto);
    const loginResult = await this.authSessionService.createSession(user);
    const csrfToken = createCsrfToken();

    setAuthCookies(
      response,
      this.appConfigService,
      loginResult.accessToken,
      loginResult.refreshToken,
      csrfToken,
    );

    const responseMode = loginQueryDto.responseMode ?? AuthResponseMode.COOKIE;

    if (responseMode === AuthResponseMode.BEARER) {
      return {
        user: loginResult.user,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        tokenType: 'Bearer',
      };
    }

    return {
      user: loginResult.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('fd_access_token')
  @ApiOperation({ summary: 'Get the current authenticated user session.' })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and renew the session cookies.' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken =
      body?.refreshToken ||
      request.cookies?.[this.appConfigService.refreshCookieName];

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing');
    }

    const session = await this.authSessionService.refreshSession(refreshToken);

    if (body?.refreshToken) {
      return {
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenType: 'Bearer',
      };
    }

    const csrfToken = createCsrfToken();

    setAuthCookies(
      response,
      this.appConfigService,
      session.accessToken,
      session.refreshToken,
      csrfToken,
    );

    return {
      user: session.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the current authenticated session cookies.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken =
      body?.refreshToken ||
      request.cookies?.[this.appConfigService.refreshCookieName];

    await this.authSessionService.revokeSession(refreshToken);
    clearAuthCookies(response, this.appConfigService);

    return { success: true };
  }
}

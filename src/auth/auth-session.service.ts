import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { StringValue } from 'ms';

import { AppConfigService } from '../config/app-config.service';
import { toPublicUser } from '../users/user.serializer';
import { UsersCommandService } from '../users/users-command.service';
import { UsersQueryService } from '../users/users-query.service';
import { RefreshTokenPayload } from './types/refresh-token-payload.interface';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
    private readonly usersQueryService: UsersQueryService,
    private readonly usersCommandService: UsersCommandService,
  ) {}

  async createSession(user: User) {
    return this.issueSession(user);
  }

  async refreshSession(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersQueryService.findAuthUserById(payload.sub);

    if (
      !user ||
      !user.refreshTokenHash ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const tokenMatches = await compare(refreshToken, user.refreshTokenHash);

    if (!tokenMatches) {
      await this.usersCommandService.clearRefreshSession(user.id);
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    return this.issueSession(user);
  }

  async revokeSession(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.usersCommandService.clearRefreshSession(payload.sub);
    } catch {
      return;
    }
  }

  private async issueSession(user: User) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh',
      },
      {
        secret: this.appConfigService.refreshTokenSecret,
        expiresIn: this.appConfigService.refreshTokenExpiresIn as StringValue,
      },
    );

    const decodedRefreshToken = this.jwtService.decode(refreshToken) as
      | RefreshTokenPayload
      | null;

    if (!decodedRefreshToken?.exp) {
      throw new UnauthorizedException('Unable to issue refresh session');
    }

    const refreshTokenHash = await hash(
      refreshToken,
      this.appConfigService.bcryptRounds,
    );

    await this.usersCommandService.saveRefreshSession(
      user.id,
      refreshTokenHash,
      new Date(decodedRefreshToken.exp * 1000),
    );

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.appConfigService.refreshTokenSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh session is invalid or expired');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }
  }
}

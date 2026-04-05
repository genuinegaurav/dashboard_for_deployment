import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AppConfigService } from '../../config/app-config.service';
import { toAuthenticatedUser } from '../../users/user.serializer';
import { UsersQueryService } from '../../users/users-query.service';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly usersQueryService: UsersQueryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request?.cookies?.[appConfigService.cookieName] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersQueryService.findAuthUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    return toAuthenticatedUser(user);
  }
}

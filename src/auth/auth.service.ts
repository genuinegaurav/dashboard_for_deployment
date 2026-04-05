import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UserStatus } from '../common/enums/user-status.enum';
import { UsersQueryService } from '../users/users-query.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersQueryService: UsersQueryService) {}

  async validateCredentials(loginDto: LoginDto) {
    const user = await this.usersQueryService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }

  async getCurrentUser(user: AuthenticatedUser) {
    return this.usersQueryService.findOne(user.id);
  }
}

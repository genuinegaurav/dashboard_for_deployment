import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { AppConfigService } from '../config/app-config.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { PublicUser } from './users.select';

@Injectable()
export class UsersCommandService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly appConfigService: AppConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const passwordHash = await hash(
      createUserDto.password,
      this.appConfigService.bcryptRounds,
    );

    return this.usersRepository.create({
      name: createUserDto.name.trim(),
      email: this.normalizeEmail(createUserDto.email),
      passwordHash,
      role: (createUserDto.role ?? UserRole.VIEWER) as PrismaUserRole,
      status: (createUserDto.status ?? UserStatus.ACTIVE) as PrismaUserStatus,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    await this.ensureUserExists(id);

    const data = {
      ...(updateUserDto.name ? { name: updateUserDto.name.trim() } : {}),
      ...(updateUserDto.email
        ? { email: this.normalizeEmail(updateUserDto.email) }
        : {}),
      ...(updateUserDto.role
        ? { role: updateUserDto.role as PrismaUserRole }
        : {}),
      ...(updateUserDto.status
        ? { status: updateUserDto.status as PrismaUserStatus }
        : {}),
    };

    if (Object.keys(data).length === 0) {
      const existingUser = await this.usersRepository.findPublicById(id);

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      return existingUser;
    }

    return this.usersRepository.updatePublic(id, data);
  }

  updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto): Promise<PublicUser> {
    return this.update(id, { status: updateUserStatusDto.status });
  }

  saveRefreshSession(
    id: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<void> {
    return this.usersRepository.updateRefreshSession(
      id,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
  }

  clearRefreshSession(id: string): Promise<void> {
    return this.usersRepository.updateRefreshSession(id, null, null);
  }

  private async ensureUserExists(id: string) {
    const exists = await this.usersRepository.exists(id);

    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

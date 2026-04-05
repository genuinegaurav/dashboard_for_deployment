import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PublicUser, userPublicSelect } from './users.select';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: PrismaUserRole;
    status: PrismaUserStatus;
  }): Promise<PublicUser> {
    return this.prisma.user.create({
      data,
      select: userPublicSelect,
    });
  }

  findAllPublic(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: userPublicSelect,
    });
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findActiveAuthUserById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        status: PrismaUserStatus.ACTIVE,
      },
    });
  }

  updatePublic(id: string, data: Prisma.UserUpdateInput): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    });
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!user;
  }

  updateRefreshSession(
    id: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ): Promise<void> {
    return this.prisma.user
      .update({
        where: { id },
        data: {
          refreshTokenHash,
          refreshTokenExpiresAt,
        },
        select: { id: true },
      })
      .then(() => undefined);
  }
}

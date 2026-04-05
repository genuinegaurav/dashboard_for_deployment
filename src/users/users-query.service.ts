import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { UsersRepository } from './users.repository';
import { PublicUser } from './users.select';

@Injectable()
export class UsersQueryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<PublicUser[]> {
    return this.usersRepository.findAllPublic();
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.usersRepository.findPublicById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  findAuthUserById(id: string): Promise<User | null> {
    return this.usersRepository.findActiveAuthUserById(id);
  }
}

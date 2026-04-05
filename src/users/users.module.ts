import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersCommandService } from './users-command.service';
import { UsersQueryService } from './users-query.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersQueryService, UsersCommandService],
  exports: [UsersRepository, UsersQueryService, UsersCommandService],
})
export class UsersModule {}

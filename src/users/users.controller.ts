import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersCommandService } from './users-command.service';
import { UsersQueryService } from './users-query.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiCookieAuth('fd_access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersCommandService: UsersCommandService,
    private readonly usersQueryService: UsersQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user account.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersCommandService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all users.' })
  findAll() {
    return this.usersQueryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by id.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersQueryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersCommandService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update only the active or inactive status of a user.' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersCommandService.updateStatus(id, updateUserStatusDto);
  }
}

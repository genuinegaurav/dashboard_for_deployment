import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFinancialRecordDto } from './dto/create-financial-record.dto';
import { QueryFinancialRecordsDto } from './dto/query-financial-records.dto';
import { UpdateFinancialRecordDto } from './dto/update-financial-record.dto';
import { FinancialRecordsCommandService } from './financial-records-command.service';
import { FinancialRecordsQueryService } from './financial-records-query.service';

@ApiTags('records')
@ApiBearerAuth()
@ApiCookieAuth('fd_access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('records')
export class FinancialRecordsController {
  constructor(
    private readonly financialRecordsCommandService: FinancialRecordsCommandService,
    private readonly financialRecordsQueryService: FinancialRecordsQueryService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a financial record.' })
  create(
    @Body() createFinancialRecordDto: CreateFinancialRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialRecordsCommandService.create(createFinancialRecordDto, user);
  }

  @Get()
  @Roles(UserRole.VIEWER, UserRole.ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'List financial records with filters and pagination.' })
  findAll(@Query() query: QueryFinancialRecordsDto) {
    return this.financialRecordsQueryService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.VIEWER, UserRole.ANALYST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a single financial record.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.financialRecordsQueryService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a financial record.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateFinancialRecordDto: UpdateFinancialRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialRecordsCommandService.update(id, updateFinancialRecordDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a financial record.' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.financialRecordsCommandService.remove(id, user);
  }
}

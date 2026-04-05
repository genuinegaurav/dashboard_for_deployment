import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { DashboardQueryService } from './dashboard-query.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@ApiCookieAuth('fd_access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VIEWER, UserRole.ANALYST, UserRole.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardQueryService: DashboardQueryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get total income, expenses, and net balance.' })
  getSummary(@Query() filters: DashboardFiltersDto) {
    return this.dashboardQueryService.getSummary(filters);
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Get category-wise income, expense, and net totals.' })
  getCategoryBreakdown(@Query() filters: DashboardFiltersDto) {
    return this.dashboardQueryService.getCategoryBreakdown(filters);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get monthly or weekly finance trends.' })
  getTrends(@Query() filters: DashboardFiltersDto) {
    return this.dashboardQueryService.getTrends(filters);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent financial activity for the dashboard.' })
  getRecentActivity(@Query() filters: DashboardFiltersDto) {
    return this.dashboardQueryService.getRecentActivity(filters);
  }

  @Get('advanced-insights')
  @Roles(UserRole.ANALYST, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get analyst-level insights such as savings rate, largest transactions, and top categories.',
  })
  getAdvancedInsights(@Query() filters: DashboardFiltersDto) {
    return this.dashboardQueryService.getAdvancedInsights(filters);
  }
}

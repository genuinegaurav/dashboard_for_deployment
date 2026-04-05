import { Module } from '@nestjs/common';

import { DashboardAnalyticsQuery } from './dashboard-analytics.query';
import { DashboardController } from './dashboard.controller';
import { DashboardQueryService } from './dashboard-query.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardAnalyticsQuery, DashboardQueryService],
})
export class DashboardModule {}

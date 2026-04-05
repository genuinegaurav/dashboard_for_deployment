import { Injectable } from '@nestjs/common';

import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { DashboardAnalyticsQuery } from './dashboard-analytics.query';

@Injectable()
export class DashboardQueryService {
  constructor(private readonly dashboardAnalyticsQuery: DashboardAnalyticsQuery) {}

  getSummary(filters: DashboardFiltersDto) {
    return this.dashboardAnalyticsQuery.getSummary(filters);
  }

  getCategoryBreakdown(filters: DashboardFiltersDto) {
    return this.dashboardAnalyticsQuery.getCategoryBreakdown(filters);
  }

  getTrends(filters: DashboardFiltersDto) {
    return this.dashboardAnalyticsQuery.getTrends(filters);
  }

  getRecentActivity(filters: DashboardFiltersDto) {
    return this.dashboardAnalyticsQuery.getRecentActivity(filters);
  }

  getAdvancedInsights(filters: DashboardFiltersDto) {
    return this.dashboardAnalyticsQuery.getAdvancedInsights(filters);
  }
}

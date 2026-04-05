import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, seconds } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import {
  resolveEnvironmentFilePaths,
  validateEnvironment,
} from './config/environment.validation';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { CsrfGuard } from './common/guards/csrf.guard';
import { ProxyAwareThrottlerGuard } from './common/guards/proxy-aware-throttler.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinancialRecordsModule } from './financial-records/financial-records.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvironmentFilePaths(process.env.NODE_ENV),
      validate: validateEnvironment,
    }),
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => ({
        throttlers: [
          {
            ttl: seconds(60),
            limit: appConfigService.isProduction ? 120 : 300,
          },
        ],
      }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    FinancialRecordsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ProxyAwareThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}

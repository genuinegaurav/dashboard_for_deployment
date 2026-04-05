import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const databaseHealthy = await this.prismaService.isHealthy();

    if (!databaseHealthy) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: {
          database: 'down',
        },
      });
    }

    return {
      status: 'ok',
      checks: {
        database: 'up',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

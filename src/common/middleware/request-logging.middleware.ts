import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { AppConfigService } from '../../config/app-config.service';
import { RequestWithContext } from '../interfaces/request-with-context.interface';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly appConfigService: AppConfigService) {}

  use(req: RequestWithContext, res: Response, next: NextFunction) {
    if (this.appConfigService.nodeEnv === 'test') {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const logLevel = this.resolveLevel(res.statusCode);
      const payload = {
        timestamp: new Date().toISOString(),
        level: logLevel,
        requestId: req.requestId ?? null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: req.ips?.[0] || req.ip || null,
        userAgent: req.get('user-agent') || null,
      };

      this.writeLog(logLevel, payload);
    });

    next();
  }

  private resolveLevel(statusCode: number): 'error' | 'warn' | 'info' {
    if (statusCode >= 500) {
      return 'error';
    }

    if (statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  }

  private writeLog(level: 'error' | 'warn' | 'info', payload: Record<string, unknown>) {
    const serialized = JSON.stringify(payload);

    if (level === 'error') {
      console.error(serialized);
      return;
    }

    if (level === 'warn') {
      console.warn(serialized);
      return;
    }

    console.info(serialized);
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ips = req.ips as string[] | undefined;
    const ip = req.ip as string | undefined;

    return ips?.[0] || ip || 'unknown';
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();

    return {
      req: http.getRequest(),
      res: http.getResponse(),
    };
  }
}

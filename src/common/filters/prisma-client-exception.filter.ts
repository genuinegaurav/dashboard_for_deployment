import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

import { RequestWithContext } from '../interfaces/request-with-context.interface';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<RequestWithContext>();
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message, error } = this.mapException(exception);

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      requestId: request.requestId ?? null,
    });
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta?.target.join(', ')
          : 'resource';

        return {
          statusCode: HttpStatus.CONFLICT,
          message: `${target} already exists`,
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
          error: 'Bad Request',
        };
    }
  }
}

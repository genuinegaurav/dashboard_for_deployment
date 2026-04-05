import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { AppConfigService } from './config/app-config.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfigService = app.get(AppConfigService);
  const prismaService = app.get(PrismaService);

  app.enableShutdownHooks();
  await prismaService.enableShutdownHooks(app);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    exposedHeaders: ['x-request-id'],
    origin: (origin, callback) => {
      if (!origin || appConfigService.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  if (appConfigService.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Finance Dashboard Backend')
      .setDescription(
        'Backend for finance data processing, role-based access control, and dashboard analytics.',
      )
      .setVersion('1.0.0')
      .addCookieAuth('fd_access_token')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(appConfigService.port, '0.0.0.0');
}

bootstrap();

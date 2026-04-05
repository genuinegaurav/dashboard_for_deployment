import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  RecordType as PrismaRecordType,
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaClientExceptionFilter } from '../src/common/filters/prisma-client-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Finance Dashboard Backend (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let passwordHash: string;

  let adminUserId: string;
  let analystUserId: string;
  let viewerUserId: string;
  let inactiveUserId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
      throw new Error(
        'DATABASE_URL and DIRECT_URL must be configured for e2e tests. Copy .env.test.example to .env.test and point it at your Supabase test database or schema.',
      );
    }

    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-suite-secret';
    process.env.REFRESH_TOKEN_SECRET =
      process.env.REFRESH_TOKEN_SECRET || 'test-suite-refresh-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN =
      process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    process.env.CORS_ORIGINS =
      process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001';
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
    process.env.SWAGGER_ENABLED = process.env.SWAGGER_ENABLED || 'false';
    process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';
    process.env.COOKIE_NAME = process.env.COOKIE_NAME || 'fd_access_token';
    process.env.REFRESH_COOKIE_NAME =
      process.env.REFRESH_COOKIE_NAME || 'fd_refresh_token';
    process.env.CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'fd_csrf_token';
    process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || 'false';
    process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.set('trust proxy', 1);
    app.use(cookieParser());
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

    await app.init();

    prisma = app.get(PrismaService);
    passwordHash = await hash('Password123!', Number(process.env.BCRYPT_ROUNDS || 4));
  });

  beforeEach(async () => {
    await prisma.financialRecord.deleteMany();
    await prisma.user.deleteMany();

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@finance.local',
        name: 'Admin User',
        passwordHash,
        role: PrismaUserRole.ADMIN,
        status: PrismaUserStatus.ACTIVE,
      },
    });

    const analystUser = await prisma.user.create({
      data: {
        email: 'analyst@finance.local',
        name: 'Analyst User',
        passwordHash,
        role: PrismaUserRole.ANALYST,
        status: PrismaUserStatus.ACTIVE,
      },
    });

    const viewerUser = await prisma.user.create({
      data: {
        email: 'viewer@finance.local',
        name: 'Viewer User',
        passwordHash,
        role: PrismaUserRole.VIEWER,
        status: PrismaUserStatus.ACTIVE,
      },
    });

    const inactiveUser = await prisma.user.create({
      data: {
        email: 'inactive@finance.local',
        name: 'Inactive User',
        passwordHash,
        role: PrismaUserRole.VIEWER,
        status: PrismaUserStatus.INACTIVE,
      },
    });

    adminUserId = adminUser.id;
    analystUserId = analystUser.id;
    viewerUserId = viewerUser.id;
    inactiveUserId = inactiveUser.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes health probes without authentication', async () => {
    const liveResponse = await request(app.getHttpServer()).get('/health/live');

    expect(liveResponse.status).toBe(200);
    expect(liveResponse.body.status).toBe('ok');

    const readinessResponse = await request(app.getHttpServer()).get('/health/ready');

    expect(readinessResponse.status).toBe(200);
    expect(readinessResponse.body.checks.database).toBe('up');
  });

  it('authenticates active users and blocks inactive users or stale tokens', async () => {
    await prisma.financialRecord.create({
      data: {
        amountInCents: 100000,
        type: PrismaRecordType.INCOME,
        category: 'salary',
        recordDate: new Date('2026-01-01T00:00:00.000Z'),
        createdByUserId: adminUserId,
      },
    });

    const activeLogin = await loginWithSession('viewer@finance.local');
    const bearerLogin = await loginWithSession('viewer@finance.local', {
      responseMode: 'bearer',
    });

    expect(activeLogin.response.status).toBe(200);
    expect(activeLogin.response.body.user.role).toBe(UserRole.VIEWER);
    expect(activeLogin.response.body.accessToken).toBeUndefined();
    expect(activeLogin.cookies.accessToken).toBeDefined();
    expect(activeLogin.cookies.refreshToken).toBeDefined();
    expect(activeLogin.cookies.csrfToken).toBeDefined();
    expect(bearerLogin.response.body.accessToken).toBeDefined();

    const currentUserResponse = await activeLogin.agent.get('/auth/me');

    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.email).toBe('viewer@finance.local');

    const inactiveLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'inactive@finance.local',
        password: 'Password123!',
      });

    expect(inactiveLogin.status).toBe(401);

    await prisma.user.update({
      where: { id: viewerUserId },
      data: { status: PrismaUserStatus.INACTIVE },
    });

    const staleCookieResponse = await activeLogin.agent.get('/auth/me');

    expect(staleCookieResponse.status).toBe(401);

    const staleTokenResponse = await request(app.getHttpServer())
      .get('/records')
      .set('Authorization', `Bearer ${bearerLogin.response.body.accessToken}`);

    expect(staleTokenResponse.status).toBe(401);
  });

  it('allows viewers to read records and dashboard data but blocks record mutations', async () => {
    await prisma.financialRecord.create({
      data: {
        amountInCents: 72000,
        type: PrismaRecordType.EXPENSE,
        category: 'rent',
        recordDate: new Date('2026-02-01T00:00:00.000Z'),
        createdByUserId: adminUserId,
      },
    });

    const viewerLogin = await loginWithSession('viewer@finance.local');

    const recordsResponse = await viewerLogin.agent.get('/records');

    expect(recordsResponse.status).toBe(200);
    expect(recordsResponse.body.total).toBe(1);
    expect(recordsResponse.body.items[0].category).toBe('rent');

    const summaryResponse = await viewerLogin.agent.get('/dashboard/summary');

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.totalExpenses).toBe(720);

    const advancedInsightsResponse = await viewerLogin.agent.get('/dashboard/advanced-insights');

    expect(advancedInsightsResponse.status).toBe(403);

    const createResponse = await viewerLogin.agent
      .post('/records')
      .set('x-csrf-token', viewerLogin.cookies.csrfToken)
      .send({
        amount: 25,
        type: 'EXPENSE',
        category: 'food',
        recordDate: '2026-02-02',
      });

    expect(createResponse.status).toBe(403);
  });

  it('lets analysts use advanced insights while staying read-only', async () => {
    const expenseRecord = await prisma.financialRecord.create({
      data: {
        amountInCents: 45000,
        type: PrismaRecordType.EXPENSE,
        category: 'travel',
        recordDate: new Date('2026-03-18T00:00:00.000Z'),
        createdByUserId: adminUserId,
      },
    });
    await prisma.financialRecord.create({
      data: {
        amountInCents: 25000,
        type: PrismaRecordType.INCOME,
        category: 'freelance',
        recordDate: new Date('2026-03-10T00:00:00.000Z'),
        createdByUserId: adminUserId,
      },
    });

    const analystLogin = await loginWithSession('analyst@finance.local');

    const recordsResponse = await analystLogin.agent.get('/records');

    expect(recordsResponse.status).toBe(200);

    const advancedInsightsResponse = await analystLogin.agent.get('/dashboard/advanced-insights');

    expect(advancedInsightsResponse.status).toBe(200);
    expect(advancedInsightsResponse.body.incomeRecordCount).toBe(1);
    expect(advancedInsightsResponse.body.expenseRecordCount).toBe(1);
    expect(advancedInsightsResponse.body.largestExpense).toMatchObject({
      category: 'travel',
      amount: 450,
    });

    const updateRecordResponse = await analystLogin.agent
      .patch(`/records/${expenseRecord.id}`)
      .set('x-csrf-token', analystLogin.cookies.csrfToken)
      .send({ notes: 'Should fail' });

    expect(updateRecordResponse.status).toBe(403);

    const usersResponse = await analystLogin.agent.get('/users');

    expect(usersResponse.status).toBe(403);
  });

  it('lets admins manage users and records end to end', async () => {
    const adminLogin = await loginWithSession('admin@finance.local');

    const createUserResponse = await adminLogin.agent
      .post('/users')
      .set('x-csrf-token', adminLogin.cookies.csrfToken)
      .send({
        name: 'Review User',
        email: 'review@finance.local',
        password: 'Password123!',
        role: 'VIEWER',
      });

    expect(createUserResponse.status).toBe(201);
    expect(createUserResponse.body.email).toBe('review@finance.local');

    const duplicateUserResponse = await adminLogin.agent
      .post('/users')
      .set('x-csrf-token', adminLogin.cookies.csrfToken)
      .send({
        name: 'Duplicate User',
        email: 'review@finance.local',
        password: 'Password123!',
        role: 'VIEWER',
      });

    expect(duplicateUserResponse.status).toBe(409);

    const createRecordResponse = await adminLogin.agent
      .post('/records')
      .set('x-csrf-token', adminLogin.cookies.csrfToken)
      .send({
        amount: 4500.75,
        type: 'INCOME',
        category: 'Salary',
        recordDate: '2026-04-01',
        notes: 'Monthly salary',
      });

    expect(createRecordResponse.status).toBe(201);
    expect(createRecordResponse.body.amount).toBe(4500.75);
    expect(createRecordResponse.body.category).toBe('salary');

    const recordId = createRecordResponse.body.id;

    const updateRecordResponse = await adminLogin.agent
      .patch(`/records/${recordId}`)
      .set('x-csrf-token', adminLogin.cookies.csrfToken)
      .send({
        notes: 'Updated salary entry',
      });

    expect(updateRecordResponse.status).toBe(200);
    expect(updateRecordResponse.body.notes).toBe('Updated salary entry');
    expect(updateRecordResponse.body.updatedByUserId).toBe(adminUserId);

    const updateUserStatusResponse = await adminLogin.agent
      .patch(`/users/${createUserResponse.body.id}/status`)
      .set('x-csrf-token', adminLogin.cookies.csrfToken)
      .send({
        status: 'INACTIVE',
      });

    expect(updateUserStatusResponse.status).toBe(200);
    expect(updateUserStatusResponse.body.status).toBe('INACTIVE');

    const deleteRecordResponse = await adminLogin.agent
      .delete(`/records/${recordId}`)
      .set('x-csrf-token', adminLogin.cookies.csrfToken);

    expect(deleteRecordResponse.status).toBe(204);

    const getDeletedRecordResponse = await adminLogin.agent.get(`/records/${recordId}`);

    expect(getDeletedRecordResponse.status).toBe(404);
  });

  it('throttles repeated failed logins on the auth endpoint', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.55')
        .send({
          email: 'viewer@finance.local',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    }

    const throttledResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '10.0.0.55')
      .send({
        email: 'viewer@finance.local',
        password: 'WrongPassword123!',
      });

    expect(throttledResponse.status).toBe(429);
  });

  it('applies filters correctly and excludes soft-deleted records from dashboard totals', async () => {
    await prisma.financialRecord.createMany({
      data: [
        {
          amountInCents: 100000,
          type: PrismaRecordType.INCOME,
          category: 'salary',
          recordDate: new Date('2026-01-10T00:00:00.000Z'),
          createdByUserId: adminUserId,
        },
        {
          amountInCents: 40000,
          type: PrismaRecordType.EXPENSE,
          category: 'rent',
          recordDate: new Date('2026-01-12T00:00:00.000Z'),
          createdByUserId: adminUserId,
        },
        {
          amountInCents: 25000,
          type: PrismaRecordType.INCOME,
          category: 'freelance',
          recordDate: new Date('2026-02-03T00:00:00.000Z'),
          createdByUserId: adminUserId,
        },
        {
          amountInCents: 5000,
          type: PrismaRecordType.EXPENSE,
          category: 'groceries',
          recordDate: new Date('2026-02-05T00:00:00.000Z'),
          createdByUserId: adminUserId,
          deletedAt: new Date('2026-02-06T00:00:00.000Z'),
        },
      ],
    });

    const viewerLogin = await loginWithSession('viewer@finance.local');

    const filteredRecordsResponse = await viewerLogin.agent
      .get('/records')
      .query({
        type: 'EXPENSE',
        category: 'rent',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

    expect(filteredRecordsResponse.status).toBe(200);
    expect(filteredRecordsResponse.body.total).toBe(1);
    expect(filteredRecordsResponse.body.items[0].category).toBe('rent');

    const summaryResponse = await viewerLogin.agent.get('/dashboard/summary');

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.totalIncome).toBe(1250);
    expect(summaryResponse.body.totalExpenses).toBe(400);
    expect(summaryResponse.body.netBalance).toBe(850);

    const breakdownResponse = await viewerLogin.agent.get('/dashboard/category-breakdown');

    expect(breakdownResponse.status).toBe(200);
    expect(
      breakdownResponse.body.items.find((item: { category: string }) => item.category === 'rent'),
    ).toMatchObject({
      category: 'rent',
      income: 0,
      expense: 400,
      netBalance: -400,
    });

    const trendsResponse = await viewerLogin.agent
      .get('/dashboard/trends')
      .query({ granularity: 'month' });

    expect(trendsResponse.status).toBe(200);
    expect(trendsResponse.body.items).toEqual([
      {
        period: '2026-01',
        income: 1000,
        expense: 400,
        netBalance: 600,
      },
      {
        period: '2026-02',
        income: 250,
        expense: 0,
        netBalance: 250,
      },
    ]);
  });

  it('rotates refresh sessions, requires CSRF for cookie writes, and clears cookies on logout', async () => {
    const adminLogin = await loginWithSession('admin@finance.local');
    const originalAccessToken = adminLogin.cookies.accessToken;
    const originalRefreshToken = adminLogin.cookies.refreshToken;

    const missingHeaderResponse = await adminLogin.agent.post('/records').send({
      amount: 25,
      type: 'EXPENSE',
      category: 'food',
      recordDate: '2026-05-02',
    });

    expect(missingHeaderResponse.status).toBe(403);

    const mismatchedHeaderResponse = await adminLogin.agent
      .post('/records')
      .set('x-csrf-token', 'invalid-token')
      .send({
        amount: 25,
        type: 'EXPENSE',
        category: 'food',
        recordDate: '2026-05-02',
      });

    expect(mismatchedHeaderResponse.status).toBe(403);

    const refreshResponse = await adminLogin.agent
      .post('/auth/refresh')
      .set('x-csrf-token', adminLogin.cookies.csrfToken);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.user.email).toBe('admin@finance.local');

    const refreshedAccessToken = getCookieValue(
      refreshResponse,
      process.env.COOKIE_NAME || 'fd_access_token',
    );
    const refreshedRefreshToken = getCookieValue(
      refreshResponse,
      process.env.REFRESH_COOKIE_NAME || 'fd_refresh_token',
    );
    const refreshedCsrfToken = getCookieValue(
      refreshResponse,
      process.env.CSRF_COOKIE_NAME || 'fd_csrf_token',
    );

    expect(refreshedAccessToken).toBeDefined();
    expect(refreshedRefreshToken).toBeDefined();
    expect(refreshedCsrfToken).toBeDefined();
    expect(refreshedAccessToken).not.toBe(originalAccessToken);
    expect(refreshedRefreshToken).not.toBe(originalRefreshToken);

    const logoutResponse = await adminLogin.agent.post('/auth/logout');

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const currentUserResponse = await adminLogin.agent.get('/auth/me');

    expect(currentUserResponse.status).toBe(401);
  });

  async function loginWithSession(
    email: string,
    options?: { responseMode?: 'cookie' | 'bearer' },
  ) {
    const ipSuffix =
      email === 'admin@finance.local'
        ? '11'
        : email === 'analyst@finance.local'
          ? '12'
          : email === 'viewer@finance.local'
            ? '13'
            : '14';

    const agent = request.agent(app.getHttpServer());
    let loginRequest = agent
      .post('/auth/login')
      .set('X-Forwarded-For', `10.0.0.${ipSuffix}`);

    if (options?.responseMode) {
      loginRequest = loginRequest.query({ responseMode: options.responseMode });
    }

    const response = await loginRequest.send({
      email,
      password: 'Password123!',
    });

    const accessTokenCookie = getCookieValue(
      response,
      process.env.COOKIE_NAME || 'fd_access_token',
    );
    const csrfTokenCookie = getCookieValue(
      response,
      process.env.CSRF_COOKIE_NAME || 'fd_csrf_token',
    );
    const refreshTokenCookie = getCookieValue(
      response,
      process.env.REFRESH_COOKIE_NAME || 'fd_refresh_token',
    );

    if (!accessTokenCookie || !refreshTokenCookie || !csrfTokenCookie) {
      throw new Error('Expected login response to include auth cookies');
    }

    return {
      agent,
      response,
      cookies: {
        accessToken: accessTokenCookie,
        refreshToken: refreshTokenCookie,
        csrfToken: csrfTokenCookie,
      },
    };
  }

  function getCookieValue(
    response: request.Response,
    cookieName: string,
  ): string | undefined {
    const headerValue = response.headers['set-cookie'] as
      | string
      | string[]
      | undefined;
    const cookies = Array.isArray(headerValue)
      ? headerValue
      : headerValue
        ? [headerValue]
        : [];
    const cookie = cookies?.find((entry) => entry.startsWith(`${cookieName}=`));

    if (!cookie) {
      return undefined;
    }

    return cookie.split(';')[0]?.split('=').slice(1).join('=');
  }
});

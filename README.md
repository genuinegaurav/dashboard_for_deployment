# Finance Dashboard — Backend + QA Frontend

A production-grade finance dashboard system built with **NestJS**, **Prisma**, **PostgreSQL**, and **Next.js**, demonstrating enterprise backend design, role-based access control, real-time analytics, and clean code architecture.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [1. User and Role Management](#1-user-and-role-management)
- [2. Financial Records Management](#2-financial-records-management)
- [3. Dashboard Summary APIs](#3-dashboard-summary-apis)
- [4. Access Control Logic](#4-access-control-logic)
- [5. Validation and Error Handling](#5-validation-and-error-handling)
- [6. Data Persistence](#6-data-persistence)
- [7. Authentication and Session Management](#7-authentication-and-session-management)
- [SOLID Principles](#solid-principles)
- [Design Patterns](#design-patterns)
- [System Design Principles](#system-design-principles)
- [Code Optimizations](#code-optimizations)
- [API Reference](#api-reference)
- [Security Hardening](#security-hardening)
- [Getting Started](#getting-started)
- [Deployment on Render](#deployment-on-render)
- [Testing](#testing)
- [Tradeoffs and Assumptions](#tradeoffs-and-assumptions)

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20.x | JavaScript runtime |
| **Backend Framework** | NestJS 11 | Modular, decorator-based API framework |
| **ORM** | Prisma 6 | Type-safe database access + migrations |
| **Database** | PostgreSQL (Supabase) | Relational data storage |
| **Auth** | Passport + JWT | Token-based authentication |
| **API Docs** | Swagger / OpenAPI | Interactive API documentation |
| **Frontend** | Next.js 14 + Tailwind CSS | QA dashboard for end-to-end testing |
| **Deployment** | Render | Cloud hosting for backend + frontend |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│                    Next.js QA Dashboard (web/)                       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  Bearer Token / Cookie Auth
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NESTJS BACKEND                                │
│                                                                      │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │  Auth   │  │  Users   │  │   Financial    │  │  Dashboard   │   │
│  │ Module  │  │  Module  │  │   Records      │  │   Module     │   │
│  │         │  │          │  │   Module       │  │              │   │
│  └────┬────┘  └─────┬────┘  └───────┬────────┘  └──────┬───────┘   │
│       │             │               │                   │           │
│  ┌────▼─────────────▼───────────────▼───────────────────▼────────┐  │
│  │                     COMMON LAYER                              │  │
│  │  Guards │ Decorators │ Filters │ Middleware │ Pipes            │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────▼────────────────────────────────────┐  │
│  │               PRISMA SERVICE (Data Access)                    │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    PostgreSQL       │
                    │    (Supabase)       │
                    └────────────────────┘
```

---

## Project Structure

```
src/
├── auth/                    # Authentication module (login, refresh, logout, JWT strategy)
│   ├── dto/                 # Login DTOs with validation
│   ├── guards/              # JwtAuthGuard (Passport integration)
│   ├── strategies/          # JWT extraction from cookie + bearer header
│   └── types/               # JWT payload and refresh token interfaces
├── common/                  # Shared infrastructure
│   ├── constants/           # Validation constants (DATE_ONLY_REGEX, etc.)
│   ├── decorators/          # @CurrentUser(), @Roles()
│   ├── enums/               # UserRole, UserStatus, RecordType, SortOrder, etc.
│   ├── filters/             # PrismaClientExceptionFilter
│   ├── guards/              # RolesGuard, CsrfGuard, ProxyAwareThrottlerGuard
│   ├── interfaces/          # AuthenticatedUser, RequestWithContext
│   ├── middleware/          # RequestContextMiddleware, RequestLoggingMiddleware
│   └── types/               # PaginatedResponse<T>
├── config/                  # AppConfigService + environment validation
├── dashboard/               # Dashboard analytics module
│   ├── dto/                 # DashboardFiltersDto
│   └── dashboard-analytics.query.ts  # Raw SQL aggregation queries
├── financial-records/       # Financial records CRUD module
│   ├── dto/                 # Create, Update, Query DTOs
│   ├── types/               # RecordFilterInput
│   ├── financial-records.repository.ts     # Data access layer
│   ├── financial-records-command.service.ts # Write operations (CQRS)
│   ├── financial-records-query.service.ts   # Read operations (CQRS)
│   ├── financial-records.serializer.ts      # Response transformation
│   ├── financial-records.helpers.ts         # Business logic utilities
│   └── financial-records.select.ts          # Prisma select projection
├── health/                  # Health probes (liveness + readiness)
├── prisma/                  # PrismaService with graceful shutdown
└── users/                   # User management module (CQRS pattern)
    ├── dto/                 # Create, Update, UpdateStatus DTOs
    ├── users-command.service.ts   # Write operations
    ├── users-query.service.ts     # Read operations
    ├── users.repository.ts        # Data access layer
    └── user.serializer.ts         # Response transformation

prisma/
├── schema.prisma            # Database schema with indexes and relations
├── migrations/              # Versioned migration SQL files
└── seed.js                  # Demo data seeding

web/                         # Next.js QA frontend
├── app/                     # Pages (login, dashboard, records, users)
├── components/              # Auth provider, app shell, UI components
└── lib/                     # API client, types, utilities

test/                        # Backend tests (unit + e2e)
scripts/                     # Bootstrap and utility scripts
```

---

## 1. User and Role Management

### Data Model

Users are stored in PostgreSQL with the following schema:

```prisma
model User {
  id                    String     @id @default(uuid())
  email                 String     @unique
  name                  String
  passwordHash          String
  refreshTokenHash      String?
  refreshTokenExpiresAt DateTime?
  role                  UserRole   @default(VIEWER)
  status                UserStatus @default(ACTIVE)
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt
}

enum UserRole   { VIEWER  ANALYST  ADMIN }
enum UserStatus { ACTIVE  INACTIVE }
```

### Role Definitions

| Role | Dashboard | Records (Read) | Records (Write) | User Management | Advanced Insights |
|---|:---:|:---:|:---:|:---:|:---:|
| **VIEWER** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ANALYST** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |

### API Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/users` | ADMIN | Create a new user |
| `GET` | `/users` | ADMIN | List all users |
| `GET` | `/users/:id` | ADMIN | Get user by ID |
| `PATCH` | `/users/:id` | ADMIN | Update user profile |
| `PATCH` | `/users/:id/status` | ADMIN | Activate / deactivate a user |

### Implementation

The Users module follows CQRS separation:
- `UsersCommandService` handles create, update, and status changes
- `UsersQueryService` handles listing and lookups
- `UsersRepository` encapsulates all Prisma data access
- `UserSerializer` (via `toPublicUser`) strips sensitive fields like `passwordHash` from API responses

---

## 2. Financial Records Management

### Data Model

```prisma
model FinancialRecord {
  id              String     @id @default(uuid())
  amountInCents   Int                              -- cents-based storage
  type            RecordType                       -- INCOME | EXPENSE
  category        String
  recordDate      DateTime   @db.Date
  notes           String?
  createdByUserId String
  updatedByUserId String?
  deletedAt       DateTime?                        -- soft delete marker
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

### Key Design Decisions

- **Cents-based money storage:** All monetary amounts are stored as integers (`amountInCents`) to avoid floating-point precision errors. Conversion happens at the serialization boundary via `amountToCents()` and `centsToAmount()`.
- **Soft delete:** Records are never physically removed. Deletion sets `deletedAt`, and all queries filter `deletedAt: null` by default.
- **Category normalization:** Categories are trimmed, space-collapsed, and lowercased for consistency.
- **Audit trail:** Every record tracks `createdByUserId` and `updatedByUserId` with foreign key relations to `User`.

### API Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/records` | ADMIN | Create a financial record |
| `GET` | `/records` | ALL | List records (filtered, paginated, sorted) |
| `GET` | `/records/:id` | ALL | Get a single record |
| `PATCH` | `/records/:id` | ADMIN | Update a record |
| `DELETE` | `/records/:id` | ADMIN | Soft delete a record (returns 204) |

### Filtering, Sorting, and Pagination

The `GET /records` endpoint supports:

| Parameter | Type | Description |
|---|---|---|
| `type` | `INCOME` / `EXPENSE` | Filter by record type |
| `category` | string | Filter by category |
| `startDate` | `YYYY-MM-DD` | Records from this date |
| `endDate` | `YYYY-MM-DD` | Records up to this date |
| `sortBy` | `recordDate` / `amount` / `category` / `createdAt` | Sorting field |
| `sortOrder` | `asc` / `desc` | Sort direction |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20) |

Pagination uses Prisma `$transaction` to atomically fetch both `count` and `findMany`, ensuring consistent totals.

---

## 3. Dashboard Summary APIs

All dashboard endpoints accept optional `startDate`, `endDate`, `granularity`, and `limit` filters.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/dashboard/summary` | ALL | Total income, expenses, net balance |
| `GET` | `/dashboard/category-breakdown` | ALL | Per-category income, expense, net |
| `GET` | `/dashboard/trends` | ALL | Monthly or weekly finance trends |
| `GET` | `/dashboard/recent-activity` | ALL | Most recent financial transactions |
| `GET` | `/dashboard/advanced-insights` | ANALYST, ADMIN | Savings rate, expense-to-income ratio, largest transactions, top categories |

### Analytics Implementation

The `DashboardAnalyticsQuery` class uses **raw SQL via Prisma `$queryRaw`** for performance-critical aggregations instead of multiple ORM calls:

- **Summary:** Single `GROUP BY "type"` query with `SUM("amountInCents")`
- **Category breakdown:** `GROUP BY "category", "type"` with in-memory pivoting
- **Trends:** `DATE_TRUNC('month'|'week')` with PostgreSQL date functions
- **Advanced insights:** `Promise.all()` to parallelize 4 independent queries (aggregate stats, ranked categories, largest income, largest expense)

All raw SQL queries use **parameterized Prisma.sql tagged templates** to prevent SQL injection.

---

## 4. Access Control Logic

### Multi-Layer Authorization

Access control is implemented through a layered guard system:

```
Request → JwtAuthGuard → RolesGuard → Controller Method
```

1. **`JwtAuthGuard`** (Passport): Extracts the JWT from cookies or `Authorization: Bearer <token>` header, verifies it, and attaches the authenticated user to `request.user`.

2. **`@Roles()` Decorator**: A metadata decorator that annotates controller methods or classes with required roles:
   ```typescript
   @Roles(UserRole.ADMIN)
   @Post()
   create(@Body() dto: CreateUserDto) { ... }
   ```

3. **`RolesGuard`**: Reads the `@Roles()` metadata via NestJS `Reflector` and checks if `request.user.role` is in the allowed list. Returns 403 if not.

4. **`CsrfGuard`** (Global): Enforces double-submit CSRF protection for cookie-based sessions. Automatically skipped for bearer-token requests.

5. **`ProxyAwareThrottlerGuard`** (Global): Respects `X-Forwarded-For` for accurate IP-based rate limiting behind reverse proxies.

### Role Enforcement Examples

```typescript
// Class-level: entire controller is ADMIN-only
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController { ... }

// Method-level override: advanced-insights restricted to ANALYST + ADMIN
@Roles(UserRole.ANALYST, UserRole.ADMIN)
@Get('advanced-insights')
getAdvancedInsights() { ... }
```

---

## 5. Validation and Error Handling

### Input Validation

The global `ValidationPipe` is configured with strict settings:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    transform: true,              // Auto-transform query params to typed DTOs
    forbidNonWhitelisted: true,   // Reject requests with unknown fields
    transformOptions: {
      enableImplicitConversion: true, // Convert strings to numbers/booleans
    },
  }),
);
```

DTOs use `class-validator` decorators for field-level validation:
- `@IsEmail()`, `@MinLength(8)` for user credentials
- `@IsEnum(RecordType)` for record type
- `@IsISO8601()` for date fields
- `@IsNumber()`, `@Min(0.01)` for amounts
- `@IsOptional()` for partial updates
- `@IsUUID()` via `ParseUUIDPipe` for path parameters

### Error Handling

| Layer | Mechanism | HTTP Code |
|---|---|---|
| Validation errors | `ValidationPipe` | 400 |
| Auth failures | `UnauthorizedException` | 401 |
| Role violations | `RolesGuard` | 403 |
| Not found | `NotFoundException` | 404 |
| Duplicate unique field | `PrismaClientExceptionFilter` (P2002) | 409 |
| Resource not found in DB | `PrismaClientExceptionFilter` (P2025) | 404 |
| Rate limit exceeded | `ThrottlerGuard` | 429 |
| CSRF token mismatch | `CsrfGuard` | 403 |

The **`PrismaClientExceptionFilter`** catches Prisma-specific database errors and maps them to meaningful HTTP responses:

```typescript
case 'P2002':  // Unique constraint violation → 409 Conflict
case 'P2025':  // Record not found → 404 Not Found
default:       // Other DB errors → 400 Bad Request
```

All error responses include a `requestId` for traceability.

### Environment Validation

The `validateEnvironment()` function runs at startup and enforces:
- All required env vars are present and correctly typed
- PostgreSQL connection strings start with `postgresql://` or `postgres://`
- `COOKIE_SECURE=true` is enforced when `COOKIE_SAME_SITE=none`
- Placeholder values (`__REPLACE_ME`) are rejected outside dev/test
- Wildcard CORS origins are blocked in production
- Port numbers are within valid ranges (1–65535)

This implements the **fail-fast principle**: the application crashes immediately with a clear error message if misconfigured, rather than silently failing later.

---

## 6. Data Persistence

### Database: PostgreSQL via Supabase

- **Provider:** PostgreSQL (hosted on Supabase for managed infrastructure)
- **ORM:** Prisma with type-safe client generation
- **Migrations:** Versioned SQL migrations in `prisma/migrations/`
- **Connection Pooling:** Supabase session pooler for runtime, direct connection for migrations

### Indexing Strategy

The schema includes targeted composite indexes for the most common query patterns:

```prisma
@@index([deletedAt])                        // Base soft-delete filter
@@index([recordDate])                       // Date-range queries
@@index([category])                         // Category filter
@@index([type])                             // Type filter
@@index([deletedAt, recordDate])            // Soft-delete + date range
@@index([deletedAt, type, recordDate])      // Soft-delete + type + date
@@index([deletedAt, category, recordDate])  // Soft-delete + category + date
@@index([createdByUserId])                  // User's own records
@@index([status, role])                     // User listing filters
```

### Data Seeding

- `prisma/seed.js` creates demo users (Admin, Analyst, Viewer, Inactive) and sample financial records
- `scripts/bootstrap-admin.js` creates a single admin user for production-like environments without demo data

---

## 7. Authentication and Session Management

### Dual Auth Strategy

The system supports two authentication transports, selected automatically:

| Transport | Use Case | Token Source |
|---|---|---|
| **Bearer Token** | Deployed frontend, API clients | `Authorization: Bearer <token>` header |
| **HttpOnly Cookie** | Local development, Swagger | `fd_access_token` cookie |

The `JwtStrategy` extracts tokens in priority order:
1. Cookie (`fd_access_token`)
2. `Authorization: Bearer` header

### Auth Flow

```
Login (POST /auth/login?responseMode=bearer)
  → Validate credentials (bcrypt compare)
  → Check user status (ACTIVE only)
  → Issue JWT access token (15m expiry)
  → Issue JWT refresh token (7d expiry)
  → Hash refresh token and store in User table
  → Return { user, accessToken, refreshToken }

Session Refresh (POST /auth/refresh)
  → Verify refresh token signature
  → Compare hash with stored hash
  → Rotate: issue new access + refresh tokens
  → Invalidate old refresh token hash
  → Return { user, accessToken, refreshToken }

Logout (POST /auth/logout)
  → Clear refresh token hash from database
  → Clear cookies (if present)
  → Return { success: true }
```

### Refresh Token Rotation

Every refresh rotates both the access and refresh tokens. The old refresh token hash is replaced with the new one, ensuring:
- **Single use:** Each refresh token can only be used once
- **Theft detection:** If a stolen token is used after rotation, the hash mismatch triggers session invalidation

### Frontend Auto-Retry

The frontend `apiFetch` client implements automatic 401 recovery:
1. On 401 response → call `/auth/refresh` with stored refresh token
2. If refresh succeeds → save new tokens and retry the original request
3. If refresh fails → clear tokens and redirect to login
4. Concurrent 401s are coalesced to prevent duplicate refresh calls

---

## SOLID Principles

### Single Responsibility Principle (SRP)

Each class has exactly one reason to change:

| Class | Responsibility |
|---|---|
| `FinancialRecordsCommandService` | Create, update, delete logic |
| `FinancialRecordsQueryService` | List, filter, paginate logic |
| `FinancialRecordsRepository` | Raw database access |
| `FinancialRecordsController` | HTTP routing and request handling |
| `PrismaClientExceptionFilter` | DB error → HTTP error mapping |
| `RequestLoggingMiddleware` | Structured request logging |
| `AppConfigService` | Configuration value access |

### Open/Closed Principle (OCP)

- **Guards and decorators** allow extending authorization rules without modifying existing controllers. Adding a new role just means passing it to `@Roles()`.
- **Exception filters** can be extended (new Prisma error codes, new filter classes) without modifying existing filters.
- **Environment validation** supports new env vars by adding fields to `ValidatedEnvironment` without changing existing validation logic.

### Liskov Substitution Principle (LSP)

- `JwtAuthGuard extends AuthGuard('jwt')` — fully substitutable with Passport's base guard contract.
- `PrismaClientExceptionFilter implements ExceptionFilter` — follows NestJS's exception filter interface exactly.
- All services are injectable and interchangeable behind their interface contracts.

### Interface Segregation Principle (ISP)

- `AuthenticatedUser` interface exposes only `id`, `email`, `role` — not the full Prisma `User` with password hash.
- `FinancialRecordResponse` is a separate serialized interface from the Prisma entity.
- `RecordFilterInput` is a minimal interface shared by both Prisma where-builder and SQL where-builder functions.

### Dependency Inversion Principle (DIP)

- Controllers depend on service abstractions, not Prisma directly.
- Services depend on repository classes, not `PrismaService` directly.
- `AppConfigService` abstracts `ConfigService` with typed getters, decoupling business logic from env var names.
- All dependencies are injected via NestJS's DI container — no `new` keyword in business logic.

---

## Design Patterns

### 1. CQRS (Command Query Responsibility Segregation)

Read and write operations are split into separate services:

```
Controller
├── CommandService  →  Create / Update / Delete
└── QueryService    →  FindAll / FindOne / Filter
```

**Applied to:** `FinancialRecords`, `Users`, `Auth` (AuthService vs AuthSessionService)

**Why:** Reads and writes have different optimization needs. Queries can use raw SQL for aggregations while commands use Prisma's type-safe ORM.

### 2. Repository Pattern

Data access is encapsulated in dedicated repository classes (`FinancialRecordsRepository`, `UsersRepository`) that expose domain-specific methods, keeping Prisma implementation details out of services.

### 3. Decorator Pattern

Custom decorators provide clean, declarative APIs:
- `@Roles(UserRole.ADMIN)` — declarative role enforcement
- `@CurrentUser()` — extracts authenticated user from request
- `@SkipThrottle()` — exempts health endpoints from rate limiting

### 4. Strategy Pattern

`JwtStrategy` encapsulates the token extraction and validation strategy. Passport's `AuthGuard` delegates to it, making it easy to swap authentication mechanisms.

### 5. Filter / Exception Handler Pattern

`PrismaClientExceptionFilter` catches domain-specific Prisma errors and translates them to HTTP responses, keeping controllers free from database error handling logic.

### 6. Middleware Chain Pattern

Requests flow through a middleware pipeline before reaching controllers:

```
Request → RequestContextMiddleware → RequestLoggingMiddleware → Guards → Controller
```

### 7. Builder Pattern

`buildRecordWhereInput()` and `buildRecordSqlWhere()` construct complex Prisma query objects from DTO parameters, isolating filter construction logic.

### 8. Serializer / Transformer Pattern

`toFinancialRecordResponse()` and `toPublicUser()` transform internal entities to API responses, ensuring internal fields (like `passwordHash`, `amountInCents`) never leak to clients.

---

## System Design Principles

### 1. Fail-Fast Configuration

Environment validation runs at boot time. Missing or invalid configuration crashes the process immediately with a clear error message, preventing silent failures in production.

### 2. Defense in Depth

Security is enforced at multiple layers:

```
Helmet (HTTP headers)
  → CORS (origin whitelist)
    → Rate Limiting (per-IP throttle)
      → CSRF Guard (double-submit cookie)
        → JWT Auth Guard (token verification)
          → Roles Guard (authorization)
            → ValidationPipe (input sanitization)
              → Controller logic
```

### 3. Request Traceability

Every request is assigned a `requestId` (UUID) via `RequestContextMiddleware`. This ID is:
- Logged with every request lifecycle event
- Included in error responses
- Returned via `x-request-id` response header
- Propagated if received from upstream via `x-request-id` request header

### 4. Graceful Shutdown

`PrismaService` implements `enableShutdownHooks()` to cleanly close database connections when the process receives `SIGTERM` or `SIGINT`, preventing connection leaks during deployments.

### 5. Health Probes

Two health endpoints for container orchestration:
- `/health/live` — basic liveness (process is running)
- `/health/ready` — readiness (database is reachable)

Rate limiting is skipped for health endpoints via `@SkipThrottle()`.

---

## Code Optimizations

### 1. Integer Money Storage

Monetary amounts are stored as integer cents (`amountInCents`) rather than floating-point. This eliminates precision errors (e.g., `0.1 + 0.2 !== 0.3`) and enables exact database aggregations.

### 2. Parallel Query Execution

Advanced insights run 4 independent SQL queries in parallel via `Promise.all()`, reducing the total latency from `4 × avg_query_time` to `max(query_time)`.

### 3. Atomic Pagination

Record listing uses `$transaction([count, findMany])` to ensure the total count and page data are consistent, preventing race conditions between count and fetch.

### 4. Composite Database Indexes

Indexes are designed for the exact query patterns used in filtering and analytics:
- `[deletedAt, type, recordDate]` — covers the most common dashboard query
- `[deletedAt, category, recordDate]` — covers category-filtered analytics

### 5. Select Projections

All Prisma queries use explicit `select` instead of `select: *`, fetching only the columns needed. This reduces data transfer and memory usage.

### 6. Refresh Token Coalescing

The frontend auto-retry logic coalesces concurrent 401–refresh–retry cycles. If multiple API calls fail with 401 simultaneously, only one refresh request is sent.

### 7. Minimal Serialization Layer

Response serialization (`toFinancialRecordResponse`, `toPublicUser`) runs pure functions without class instantiation, keeping response mapping fast and GC-friendly.

### 8. Raw SQL for Analytics

Dashboard aggregations use `$queryRaw` with tagged template literals instead of multiple Prisma ORM calls. This allows leverage of PostgreSQL aggregate functions (`SUM`, `AVG`, `COUNT`, `DATE_TRUNC`) in a single round trip.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Login (cookie mode) |
| `POST` | `/auth/login?responseMode=bearer` | Public | Login (bearer mode) |
| `GET` | `/auth/me` | JWT | Get current user |
| `POST` | `/auth/refresh` | Cookie or Body | Rotate session |
| `POST` | `/auth/logout` | Cookie or Body | End session |

### Users (ADMIN only)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/users` | Create user |
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `PATCH` | `/users/:id` | Update user |
| `PATCH` | `/users/:id/status` | Change user status |

### Financial Records

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/records` | ADMIN | Create record |
| `GET` | `/records` | ALL | List (filtered, paginated) |
| `GET` | `/records/:id` | ALL | Get single record |
| `PATCH` | `/records/:id` | ADMIN | Update record |
| `DELETE` | `/records/:id` | ADMIN | Soft delete (204) |

### Dashboard

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/dashboard/summary` | ALL | Income, expenses, net balance |
| `GET` | `/dashboard/category-breakdown` | ALL | Per-category totals |
| `GET` | `/dashboard/trends` | ALL | Monthly/weekly trend data |
| `GET` | `/dashboard/recent-activity` | ALL | Recent transactions |
| `GET` | `/dashboard/advanced-insights` | ANALYST, ADMIN | Deep analytics |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health/live` | Public | Liveness probe |
| `GET` | `/health/ready` | Public | Readiness probe (checks DB) |

---

## Security Hardening

| Feature | Implementation |
|---|---|
| **Helmet** | Sets secure HTTP headers (CSP, X-Frame-Options, etc.) |
| **CORS** | Whitelist-based origin checking via `CORS_ORIGINS` |
| **Rate Limiting** | IP-based throttle (120 req/min prod, 300 dev) |
| **CSRF Protection** | Double-submit cookie pattern for cookie-based sessions |
| **Password Hashing** | bcrypt with configurable rounds (10 dev, 12 prod) |
| **JWT Expiry** | Short-lived access tokens (15m) + rotating refresh tokens (7d) |
| **Input Sanitization** | Whitelist-only `ValidationPipe` with `forbidNonWhitelisted` |
| **SQL Injection Prevention** | Parameterized queries via Prisma tagged templates |
| **Soft Delete** | No physical destruction of financial data |
| **Request Tracing** | UUID-based `x-request-id` for audit trails |
| **Cookie Security** | `HttpOnly`, `Secure`, `SameSite` flags |
| **Header Removal** | `x-powered-by` disabled |
| **Proxy Trust** | `trust proxy` enabled for correct IP resolution behind Render |

---

## Getting Started

### Prerequisites

- Node.js 20.x
- PostgreSQL database (Supabase recommended)

### Backend Setup

```bash
# 1. Install dependencies
npm install

# 2. Create env file
cp .env.supabase.example .env
# Edit .env with your Supabase connection strings and secrets

# 3. Run migrations
npm run prisma:migrate:dev

# 4. Seed demo data
npm run prisma:seed:dev

# 5. Start backend
npm run start:dev
```

### Frontend Setup

```bash
# 1. Create frontend env
cp .env.frontend.example web/.env.local

# 2. Install frontend dependencies
npm --prefix web install

# 3. Start frontend
npm run frontend:dev
```

### Local URLs

- Backend API: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/docs`
- Frontend Dashboard: `http://localhost:3001`

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@finance.local` | `Password123!` |
| Analyst | `analyst@finance.local` | `Password123!` |
| Viewer | `viewer@finance.local` | `Password123!` |
| Inactive | `inactive@finance.local` | `Password123!` |

---

## Deployment on Render

### Backend Service

| Setting | Value |
|---|---|
| **Build Command** | `npm install && npm run build` |
| **Pre-Deploy Command** | `npm run prisma:migrate:deploy` |
| **Start Command** | `npm run start:prod` |
| **Health Check Path** | `/health/ready` |
| **Node Version** | 20.x |

### Frontend Service

| Setting | Value |
|---|---|
| **Root Directory** | `web/` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Environment** | `NEXT_PUBLIC_API_BASE_URL=<backend-url>` |

### Required Backend Environment Variables

```env
NODE_ENV=production
DATABASE_URL=<supabase-runtime-url>
DIRECT_URL=<supabase-direct-url>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<another-strong-secret>
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGINS=<frontend-url>
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

---

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests (requires test database)
cp .env.test.example .env.test
npm run test:e2e

# Watch mode
npm run test:watch
```

### Test Architecture

- **Unit tests:** Environment validation with edge cases
- **E2E tests:** Full HTTP lifecycle via Supertest
- **Framework:** Jest + ts-jest

---

## Tradeoffs and Assumptions

| Decision | Rationale |
|---|---|
| **Bearer tokens for deployed frontend** | Cross-origin cookie auth is unreliable between separate Render subdomains. Bearer tokens stored in localStorage provide consistent auth transport. |
| **localStorage for tokens** | Practical tradeoff for split-origin deployment. For hardened production: use same-origin proxy or custom domain with cookie auth. |
| **Raw SQL for analytics** | Prisma ORM doesn't support complex aggregates (`DATE_TRUNC`, window functions). Raw SQL with parameterized templates gives performance without sacrificing safety. |
| **Cents-based storage** | Integer arithmetic avoids floating-point rounding in financial calculations. Industry standard for money handling. |
| **Soft delete** | Financial records should never be physically destroyed for audit compliance. |
| **No pagination on users** | User lists are expected to be small (< 100). Pagination would add complexity without benefit. |
| **Supabase as default** | Provides managed PostgreSQL with connection pooling, eliminating Docker dependency for local development. |
| **Enum-based roles** | Sufficient for the three-role model. A permission-based system (RBAC with permissions table) would be warranted for 10+ roles. |

---

## Useful Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start backend in dev mode |
| `npm run build` | TypeScript build |
| `npm run start:prod` | Start production server |
| `npm run prisma:migrate:dev` | Run migrations (dev) |
| `npm run prisma:migrate:deploy` | Run migrations (production) |
| `npm run prisma:seed:dev` | Seed demo data |
| `npm run admin:bootstrap` | Create a production admin |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run frontend:dev` | Start frontend dev server |
| `npm run frontend:build` | Build frontend |

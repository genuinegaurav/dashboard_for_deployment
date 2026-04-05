# Finance Dashboard Backend + QA Frontend

Production-shaped finance dashboard system with:

- `NestJS` backend for auth, RBAC, validation, and business logic
- `Prisma` for typed data access and migrations
- `PostgreSQL` as the database engine
- `Supabase` as the recommended managed Postgres provider
- `Next.js` QA dashboard frontend for end-to-end role testing
- `HttpOnly` cookie sessions with double-submit CSRF protection

## What This Repo Now Includes

### Backend

- JWT-based auth owned by the Nest backend
- `VIEWER`, `ANALYST`, `ADMIN` role enforcement
- user management APIs
- financial record CRUD with soft delete
- dashboard summary and aggregation APIs
- analyst/admin advanced insights endpoint
- health probes
- structured request logging
- Swagger for API inspection

### Frontend

- same-repo `web/` Next.js app
- login page for seeded/demo users
- dashboard page for summaries, trends, recent activity, and analyst insights
- records page for filters, detail viewing, and admin CRUD
- users page for admin-only provisioning and role/status updates

## Repository Layout

```text
src/                    Nest backend
prisma/                 Prisma schema, migrations, seed
scripts/                bootstrap scripts
test/                   backend unit/e2e tests
web/                    Next.js QA dashboard
```

## Auth Model

The backend remains the auth owner.

- `POST /auth/login`
  - verifies email/password
  - sets `fd_access_token` as an `HttpOnly` cookie
  - sets `fd_refresh_token` as an `HttpOnly` cookie
  - sets `fd_csrf_token` as a readable cookie
  - returns `user`
- `POST /auth/refresh`
  - rotates the refresh session
  - renews the access, refresh, and CSRF cookies
  - returns `user`
- `GET /auth/me`
  - returns the current authenticated user from the session cookie
- `POST /auth/logout`
  - clears session cookies

Browser/frontend auth should use cookies only.

For explicit development or test flows, `POST /auth/login?responseMode=bearer` still returns an `accessToken` outside production so Swagger and manual bearer-token testing remain practical.

## CSRF Model

State-changing requests that use cookie auth require:

- `fd_csrf_token` cookie
- matching `x-csrf-token` header

This is enforced for:

- `POST`
- `PATCH`
- `DELETE`

It is skipped for:

- `GET`, `HEAD`, `OPTIONS`
- `POST /auth/login`
- `POST /auth/logout`
- bearer-token requests that are not using the auth cookie

## Environment Files

### Backend

- [.env.example](/Users/premsh/gaurav/.env.example)
- [.env.development.example](/Users/premsh/gaurav/.env.development.example)
- [.env.test.example](/Users/premsh/gaurav/.env.test.example)
- [.env.production.example](/Users/premsh/gaurav/.env.production.example)
- [.env.supabase.example](/Users/premsh/gaurav/.env.supabase.example)

### Frontend

- [.env.frontend.example](/Users/premsh/gaurav/.env.frontend.example)
- [web/.env.example](/Users/premsh/gaurav/web/.env.example)

## Backend Runtime Contract

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXPIRES_IN`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- `SWAGGER_ENABLED`
- `BCRYPT_ROUNDS`
- `COOKIE_NAME`
- `REFRESH_COOKIE_NAME`
- `CSRF_COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `COOKIE_DOMAIN` optional

The backend validates these values at startup.

## Supabase Setup

This repo treats Supabase as the default database path.

### 1. Create Supabase projects

Create:

- one project for `development`
- one project for `production`

Recommended:

- create a dedicated `test` project or schema for e2e runs

### 2. Copy connection strings

From Supabase, copy:

- runtime or session-pooler Postgres URL for `DATABASE_URL`
- direct Postgres URL for `DIRECT_URL`

If the direct host is not reachable from your local IPv4-only environment, you can temporarily point `DIRECT_URL` at the Supabase session pooler as well.

Use placeholders until your real values are ready:

```env
DATABASE_URL="__REPLACE_ME_SUPABASE_RUNTIME_URL__"
DIRECT_URL="__REPLACE_ME_SUPABASE_DIRECT_URL__"
```

### 3. Create backend env file

Copy:

```bash
cp .env.supabase.example .env
```

Then replace placeholders with your Supabase values.

For local frontend + backend development, a good starting point is:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="__REPLACE_ME_SUPABASE_RUNTIME_URL__"
DIRECT_URL="__REPLACE_ME_SUPABASE_DIRECT_URL__"
JWT_SECRET="local-development-secret-change-me"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="local-development-refresh-secret-change-me"
REFRESH_TOKEN_EXPIRES_IN="7d"
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
LOG_LEVEL="debug"
SWAGGER_ENABLED="true"
BCRYPT_ROUNDS=10
COOKIE_NAME="fd_access_token"
REFRESH_COOKIE_NAME="fd_refresh_token"
CSRF_COOKIE_NAME="fd_csrf_token"
COOKIE_SECURE="false"
COOKIE_SAME_SITE="lax"
```

### 4. Install backend dependencies

```bash
npm install
```

### 5. Run migrations

```bash
npm run prisma:migrate:dev
```

### 6. Seed demo data

```bash
npm run prisma:seed:dev
```

### 7. Bootstrap the first admin for a production-like database

If you do not want demo seed data:

```bash
npm run admin:bootstrap -- --email admin@example.com --name "Platform Admin" --password "StrongPassword123!"
```

## Frontend Setup

### 1. Create frontend env file

```bash
cp .env.frontend.example web/.env.local
```

Default local value:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

### 2. Install frontend dependencies

```bash
npm --prefix web install
```

### 3. Start the frontend

```bash
npm run frontend:dev
```

The frontend runs on:

```text
http://localhost:3001
```

## Local Development Flow

### Terminal 1: backend

```bash
npm run start:dev
```

### Terminal 2: frontend

```bash
npm run frontend:dev
```

### URLs

- backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- frontend QA dashboard: `http://localhost:3001`

## Testing the System

### Swagger / API

Use Swagger to test raw backend endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET /records`
- `GET /dashboard/summary`
- `GET /dashboard/advanced-insights`
- `GET /users`

### Frontend role QA

Seeded users:

- `admin@finance.local / Password123!`
- `analyst@finance.local / Password123!`
- `viewer@finance.local / Password123!`
- `inactive@finance.local / Password123!`

Expected behavior:

- `ADMIN`
  - full record CRUD
  - full user management
  - advanced insights
- `ANALYST`
  - read-only records and dashboard
  - advanced insights
- `VIEWER`
  - read-only records and dashboard
- `INACTIVE`
  - login blocked

### Automated backend tests

```bash
cp .env.test.example .env.test
npm run test
npm run test:e2e
```

## Data Inspection

Once you are using Supabase, you can inspect data through:

- Supabase `Table Editor`
- Supabase `SQL Editor`
- Prisma Studio

Example Prisma Studio command:

```bash
npx prisma studio
```

This uses the current backend env values, so point `.env` at the Supabase project you want to inspect first.

## Render Deployment

### Backend service

Use a Render Web Service with:

- Build command:
  ```bash
  npm install && npm run build
  ```
- Pre-deploy command:
  ```bash
  npm run prisma:migrate:deploy
  ```
- Start command:
  ```bash
  npm run start:prod
  ```

Backend envs:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXPIRES_IN`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- `SWAGGER_ENABLED=false`
- `BCRYPT_ROUNDS`
- `COOKIE_NAME`
- `REFRESH_COOKIE_NAME`
- `CSRF_COOKIE_NAME`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`
- `COOKIE_DOMAIN` if you need a shared cookie domain

Recommended health check:

- `/health/ready`

### Frontend service

Use a separate Render Web Service for `web/`.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run start
```

Frontend envs:

- `NEXT_PUBLIC_API_BASE_URL=<your-backend-render-url>`

## Docker Dependency

Supabase removes Docker from the default day-to-day developer workflow because your database is no longer running in a local container.

That means:

- backend can run locally without Docker
- frontend can run locally without Docker
- database is hosted in Supabase

Docker can still remain useful later for:

- isolated CI/database test isolation
- containerized deployment workflows

But it is no longer required just to run the app locally.

## Useful Scripts

### Backend

- `npm run start:dev`
- `npm run build`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed:dev`
- `npm run admin:bootstrap`
- `npm run test`
- `npm run test:e2e`

### Frontend

- `npm run frontend:dev`
- `npm run frontend:build`
- `npm run frontend:start`

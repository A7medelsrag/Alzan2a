# Phase 0 Assessment — Platform Baseline

## Initial repository assessment

The repository is a pnpm workspace with React 19/Vite 8 storefront and admin applications, a Fastify 5 TypeScript API, Prisma 6 with PostgreSQL, and a shared TypeScript/Zod package. The apps are currently UI shells; they do not call the API. The API used a direct `PrismaClient`, a basic health endpoint, a small catalog prototype, and a prototype checkout/order route.

PostgreSQL and Redis are defined in `docker-compose.yml`. Redis had no application client, session implementation, or lifecycle handling. There was no authentication, authorization, image upload/storage code, centralized configuration, CORS policy, structured API logging configuration, request IDs, readiness endpoint, or rate-limiting foundation.

The only committed Prisma migration is `20261103060702_init_catalog_orders`. It creates prototype category, product, variant, order, and order-item tables. The configured PostgreSQL database is reachable and schema status is up to date. It contains 1 category, 1 product, 2 variants, and no orders or order items. No mutation was made to the database.

## Phase 0 implementation

- Centralized typed API configuration in `packages/shared/src/api-config.ts`; production now requires explicit `CORS_ALLOWED_ORIGINS`.
- Added a safe `.env.example` with placeholders and documented API configuration values.
- Added UUID request IDs, structured Fastify/Pino logging with redaction for credentials and sensitive request fields, a consistent error envelope, and Fastify rate-limiting foundation. Health probes are intentionally exempt.
- Added a restrictive explicit CORS/origin policy, request body limit, and HTTP security headers.
- Added `/health/live` and database-backed `/health/ready`. Readiness returns only a stable dependency error code.
- Preserved the existing Prisma schema, migration, repository code, and order data. The prototype catalog/order routes are no longer registered because internal checkout/orders are explicitly outside the approved WhatsApp-only scope.
- Redis remains configuration-only until Phase 1; no fake session implementation was added.

## Files modified or created

- Modified: `.env.example`, `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/config.ts`, `apps/api/src/errors.ts`, `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `packages/shared/src/index.ts`, `docs/PROGRESS.md`.
- Created: `apps/api/src/plugins/security.ts`, `apps/api/src/plugins/rate-limit.ts`, `apps/api/src/routes/health.routes.ts`, `apps/api/src/services/health.service.ts`, `packages/shared/src/api-config.ts`, `packages/shared/src/api-config.test.ts`, this assessment.
- Removed: none. No database migration was created or executed.

## Architectural issues retained for a later phase

- The prototype schema contains `Order`/`OrderItem` and variant stock fields, which are out of the WhatsApp-only release scope. Existing data must be reviewed before a separate approved cleanup or archival migration.
- The current `ProductStatus.ACTIVE` name differs from the planned public `published` terminology. Resolve this only as part of the Phase 2 migration plan.
- There is no Redis client dependency or server session implementation yet; that belongs to Phase 1.
- The rate-limit plugin currently uses its built-in process-local store. Bind it to the approved Redis client before running more than one API process.
- There is no image storage/upload adapter; that belongs to Phase 2.
- The existing local `.env` predates the new CORS keys. Set `CORS_ALLOWED_ORIGINS` locally before browser-to-API requests are enabled.

## Verification

Passed:

- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test` — 18 tests passed in 5 files
- `pnpm.cmd --filter @store/api build`
- `pnpm.cmd --filter @store/api exec prisma migrate status`
- A read-only Prisma count query confirmed the development-data counts stated above.

No destructive migration, seed, or data-changing command was executed.

## Recommended Phase 1 work

Add `AdminAccount` and append-only `AuditLog` through a forward-only migration after backup/rehearsal; introduce a Redis client, opaque admin sessions, Argon2id authentication, CSRF/origin protection for state changes, login throttling, an Owner-only CLI seed, and focused security tests.

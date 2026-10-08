## Description

[Nest](https://github.com/nestjs/nest) backend for Cobo

## Installation

Use Node.js 24 or newer and pnpm 10.18.3.

```bash
$ pnpm install
```

Prisma Client is generated during installation from `prisma/schema.prisma`. Set `DATABASE_URL`, `JWT_KEY`, and `JWT_KEY_REFRESH` in the runtime environment or a local `.env` file before starting the application.

## Running the app

```bash
# development
$ pnpm start

# watch mode
$ pnpm start:dev

# production mode
$ pnpm start:prod
```

## Authentication

`POST /auth/login` accepts `{ phone, password }` and verifies the password before
returning `{ access_token, refresh_token }`. Unknown accounts and wrong passwords
both return 401; malformed credentials return 400. Profile endpoints exclude
password, stored refresh token, and session fields.

`GET /auth/refresh` accepts the refresh token as a bearer token. Refresh tokens have
unique JWT IDs, are stored as SHA-256 digests, and rotate through an atomic
compare-and-swap update. Replayed or replaced tokens return 401. The current model
supports one refresh session per user; a new login replaces it. Existing legacy
refresh-token storage is intentionally invalidated: users must sign in again.

Use HTTPS for deployed authentication. Add rate limiting and review deployment
security before exposing sign-in publicly. `auth.http.spec.ts` exercises real
bcrypt/JWT/guards with in-memory persistence, not a live production database.

Development seed passwords are bcrypt-hashed before storage. Re-running the seed
repairs only the known legacy plaintext seed password; it does not overwrite an
existing password hash. Do not insert plaintext passwords directly into the database.
Run the isolated seed regression with `pnpm exec tsx --test prisma/seed/seed-user.test.ts`.

## Test Commands

Households support name-only creation. The optional `addressId` relation is separate
from the primary key; migration `20261008130000_optional_household_address` preserves
legacy address links and removes the accidental address requirement. Apply with
`pnpm exec prisma migrate deploy` and regenerate Prisma Client after schema changes.

`pnpm exec tsx --test test/household-address-migration.test.ts` verifies migration
behavior on temporary tables and name-only creation with owner membership in a
rolled-back transaction against the configured database. It requires an existing
user and persists no test household or membership (sequences may advance).

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e

# test coverage
$ pnpm test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

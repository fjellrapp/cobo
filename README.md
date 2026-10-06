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

## Test

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

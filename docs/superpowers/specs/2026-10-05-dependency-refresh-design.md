# Dependency Refresh Design

## Goal

Bring the Cobo backend's framework and supporting development/runtime dependencies up to current stable, mutually compatible releases, while preserving the existing API and application architecture.

## Current Context

The repository is a NestJS backend currently using NestJS 9, Prisma 4, TypeScript 4, Jest 28, and a collection of older build and lint dependencies. The tracked package-manager lockfile is `pnpm-lock.yaml`. There is also an untracked `yarn.lock` in the working tree; it is not part of this upgrade and must not be modified or removed.

The application contains authentication, user, and household modules, uses PostgreSQL through Prisma, and has a Vercel deployment configuration. There is an existing user modification in `src/modules/auth/repository/accessToken.repository.ts`; it must be preserved.

## Scope

- Upgrade NestJS and its first-party packages to a mutually compatible current stable release.
- Upgrade Prisma and the generated Prisma client, retaining the current data model and migration history unless compatibility requires a focused code/configuration adjustment.
- Upgrade TypeScript and the unit/e2e test, lint, and build toolchain to versions compatible with the selected NestJS and Prisma releases.
- Upgrade other direct dependencies where needed for current runtime support, compatibility, or security. Do not perform unrelated feature work or broad refactoring.
- Use pnpm as the canonical package manager and update the tracked `pnpm-lock.yaml`.
- Preserve API behavior, authentication semantics, persistence behavior, and deployment intent.
- Adjust source and configuration only where required by breaking changes or to keep the supported workflows functioning.

## Out Of Scope

- Replacing NestJS or rebuilding the project from a new template.
- Changing endpoint contracts, authentication behavior, or the PostgreSQL schema/data semantics.
- Switching package managers.
- Modifying or removing the untracked `yarn.lock` or the existing user edit in `accessToken.repository.ts`.
- Unrelated refactoring, new features, and deployment-platform redesign.

## Implementation Approach

Select current stable releases at implementation time, checking that framework, runtime, compiler, ORM, and tooling versions are mutually compatible. Upgrade in dependency groups, addressing major-version migration requirements as they arise. Keep changes localized to dependency manifests/lockfile, tool configuration, Prisma configuration/client generation, and code directly affected by compatibility changes.

Preserve the existing deployment configuration unless a selected supported version requires a targeted adjustment. The selected NestJS, Prisma, and Vercel Node runtime support Node.js 24; declare Node.js 24 as the project runtime major without imposing a patch-level minimum not required by the retained dependency set.

## Validation

Validate the dependency graph and lockfile with pnpm, then run the relevant repository checks:

- Prisma schema validation and generated-client generation.
- Production build.
- Lint.
- Unit tests.
- End-to-end tests.

Distinguish upgrade-related failures from checks blocked by unavailable external services or environment configuration. Do not claim a check passed unless it was run successfully.

## Acceptance Criteria

- The project installs reproducibly using pnpm and the tracked lockfile.
- NestJS, Prisma, TypeScript, and the test/build/lint toolchain are on current stable, compatible versions selected during implementation.
- Prisma schema validation and client generation succeed without unintended schema or migration changes.
- Build, lint, unit tests, and e2e tests pass, or any environment-blocked checks are clearly identified with evidence.
- Existing API and deployment behavior are preserved, subject only to necessary compatibility adjustments.
- Existing user changes, including the untracked Yarn lockfile and `accessToken.repository.ts` edit, remain untouched.

# Dependency Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Cobo backend's NestJS, Prisma, TypeScript, and supporting toolchain to current stable compatible versions without changing its API, persistence semantics, or deployment intent.

**Architecture:** Keep the existing Nest modules, PostgreSQL data model, and Vercel deployment. Upgrade dependency groups with pnpm, applying only compatibility-driven source and configuration changes; validate each group before proceeding. `pnpm-lock.yaml` remains canonical, and pre-existing user changes, including `yarn.lock` and `src/modules/auth/repository/accessToken.repository.ts`, must be preserved.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, pnpm, Jest, ESLint, Prettier, Vercel.

---

## File Map

- `package.json`: direct dependency versions, scripts, and possibly an explicit Node engine requirement if the selected stack requires one.
- `pnpm-lock.yaml`: reproducible dependency resolution. Never regenerate with another package manager.
- `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`: compiler and Nest CLI compatibility adjustments.
- `.eslintrc.js`, `.prettierrc`: lint/format compatibility adjustments, only if required by current versions.
- `test/jest-e2e.json` and the Jest section in `package.json`: Jest and ts-jest compatibility/configuration.
- `prisma/schema.prisma`, `prisma/seed/index.ts`, `prisma/client/index.ts`, `src/common/providers/prisma.service.ts`: Prisma generator/configuration/client API changes, only as required by the selected Prisma major.
- `src/**/*.ts`: only code that must change for upgraded NestJS, Prisma, TypeScript, or direct runtime packages. Preserve API and behavior.
- `README.md`, `vercel.json`: document any necessary runtime baseline or deployment setting change; otherwise leave deployment configuration intact.

## Task 1: Capture Baseline And Resolve Runtime Compatibility

**Files:** No source changes. Record results before dependency edits.

- [ ] **Step 1: Confirm current toolchain and package-manager state**

Run:

```bash
node --version
pnpm --version
git status --short
```

Expected: Node and pnpm versions are printed; the existing edit to `src/modules/auth/repository/accessToken.repository.ts` and untracked `yarn.lock` remain visible and untouched.

- [ ] **Step 2: Run the current validation baseline**

Run:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm build
pnpm lint
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
```

Expected: capture each command's exit status and output. Record pre-existing failures and environment requirements so they are not mistaken for upgrade regressions. Do not change the lockfile in this baseline step.

- [ ] **Step 3: Check current stable versions and engine constraints**

Inspect current release and `engines` metadata for the directly used framework, ORM, compiler, and tooling packages. Check NestJS, Prisma, TypeScript, Jest/ts-jest, ESLint/typescript-eslint, Node.js, and the Vercel Node runtime together. Use registry metadata and release migration guides rather than assuming that independent latest versions are compatible.

Run package metadata queries as needed, for example:

```bash
pnpm view @nestjs/core version engines
pnpm view prisma version engines
pnpm view @prisma/client version engines
pnpm view typescript version engines
pnpm view jest version engines
pnpm view ts-jest version engines
```

Expected: choose a mutually compatible set of current stable releases and record required major-version migrations. If that set requires raising the Node.js baseline beyond the repository's documented/deployment-supported runtime, stop before changing dependencies and get confirmation for the runtime change. Otherwise use the already-supported Node baseline.

## Task 2: Upgrade NestJS Runtime Packages

**Files:** `package.json`, `pnpm-lock.yaml`, and Nest-dependent files under `src/` only if migration guides or compiler errors require changes.

- [ ] **Step 1: Upgrade aligned NestJS runtime packages**

Upgrade `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/jwt`, and `@nestjs/passport` together to the selected compatible stable versions. Keep Express as the existing HTTP adapter. Resolve peer dependencies through pnpm and inspect the resulting diff to ensure only intended packages changed.

After Task 1 confirms the current stable Nest packages share a compatible release line, run:

```bash
pnpm add @nestjs/common@latest @nestjs/core@latest @nestjs/platform-express@latest @nestjs/jwt@latest @nestjs/passport@latest
```

Expected: command completes and updates `package.json` and `pnpm-lock.yaml`. `latest` resolves stable releases, not prereleases; inspect package peer metadata and the lockfile to verify the Nest packages are compatible and aligned before continuing.

- [ ] **Step 2: Upgrade the Nest CLI, schematics, and testing package in lockstep**

After Task 1 confirms the Nest CLI packages share a compatible release line, run:

```bash
pnpm add -D @nestjs/cli@latest @nestjs/schematics@latest @nestjs/testing@latest
```

Expected: all Nest first-party packages target a mutually compatible release line; verify peer metadata and lockfile resolutions, and confirm the Nest CLI still recognizes the existing `nest-cli.json` configuration.

- [ ] **Step 3: Check bootstrap, module, guards, and strategy compatibility**

Run:

```bash
pnpm build
pnpm test -- --runInBand
```

Expected: existing app compiles and unit tests pass. For each compatibility error, make the smallest source change in the reported Nest integration point, preserving HTTP methods, CORS options, authentication/authorization behavior, and module wiring. Re-run both commands after changes.

## Task 3: Upgrade Prisma And Validate Data Compatibility

**Files:** `package.json`, `pnpm-lock.yaml`, `prisma/schema.prisma`, `prisma/seed/index.ts`, `prisma/client/index.ts`, `src/common/providers/prisma.service.ts`, and any application imports directly affected by Prisma's migration.

- [ ] **Step 1: Upgrade Prisma CLI and client to the same release**

Upgrade `prisma` and `@prisma/client` together. Follow every required migration between the installed and selected major versions, including generator/configuration changes. Do not edit migration SQL or change the data model unless a documented compatibility requirement makes it unavoidable.

After Task 1 confirms Prisma CLI and client latest releases are aligned, run:

```bash
pnpm add @prisma/client@latest
pnpm add -D prisma@latest
```

Expected: both packages resolve to the same selected stable release. Verify exact resolved versions in `package.json` and `pnpm-lock.yaml` before proceeding.

- [ ] **Step 2: Apply Prisma migration changes and regenerate the client**

Update only the Prisma schema/configuration and seed/client setup required by the selected Prisma release. Preserve PostgreSQL as provider and the existing schema semantics. Keep the application's Prisma lifecycle behavior equivalent; adapt `$on('beforeExit')` or other APIs only if removed or changed by the selected client version.

Run:

```bash
pnpm exec prisma validate
pnpm exec prisma generate
```

Expected: schema validates and client generation succeeds. No new database migration is created solely for a tooling upgrade.

- [ ] **Step 3: Verify Prisma consumer types and persistence tests**

Run:

```bash
pnpm build
pnpm test -- --runInBand
```

Expected: all current `@prisma/client` model imports and Prisma service compile, and unit tests pass. Update only consumer code whose types/API changed; preserve query results and persistence semantics.

## Task 4: Upgrade TypeScript, Tests, And Developer Tooling

**Files:** `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `test/jest-e2e.json`, `.eslintrc.js`, `.prettierrc`, and test/source files only for errors caused by the updated compiler or tools.

- [ ] **Step 1: Upgrade TypeScript and Nest-compatible build tooling**

Upgrade TypeScript, `ts-node`, `tsconfig-paths`, `ts-loader`, `source-map-support`, and any Nest builder packages required by the selected Nest CLI. Confirm decorator metadata, experimental decorators, CommonJS output, and emitted production files continue to match the current application runtime.

After Task 1 confirms versions and engine compatibility, run:

```bash
pnpm add -D typescript@latest ts-node@latest tsconfig-paths@latest ts-loader@latest source-map-support@latest
```

Expected: the compiler and build dependencies satisfy Nest CLI peer/engine constraints. Inspect peer metadata and lockfile versions; update `tsconfig.json` only for actual compatibility requirements, without enabling stricter checks or altering module output as unrelated cleanup.

- [ ] **Step 2: Upgrade Jest, ts-jest, and test types as a compatible set**

Upgrade `jest`, `ts-jest`, `@types/jest`, `supertest`, and `@types/supertest` to compatible versions. Keep unit/e2e test discovery and the existing Node test environment.

After Task 1 confirms a compatible Jest and ts-jest release set, run:

```bash
pnpm add -D jest@latest ts-jest@latest @types/jest@latest supertest@latest @types/supertest@latest
```

Expected: dependency peer constraints resolve and both test configurations load. Inspect peer metadata and lockfile versions; modify Jest configuration only to satisfy the selected Jest/ts-jest migration requirements.

- [ ] **Step 3: Upgrade lint and formatting toolchain coherently**

Upgrade ESLint, typescript-eslint parser/plugin, Prettier, and their integration packages as a compatible set. Remove obsolete configuration rules only when the selected major versions no longer recognize them; retain the current lint intent and scripts.

After Task 1 confirms a compatible ESLint/typescript-eslint set, run:

```bash
pnpm add -D eslint@latest @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest prettier@latest eslint-config-prettier@latest eslint-plugin-prettier@latest
pnpm lint
```

Expected: lint runs without configuration errors. Avoid whole-repository formatting churn; only fix findings necessary to make the current lint command pass.

## Task 5: Refresh Remaining Direct Dependencies And Lockfile

**Files:** `package.json`, `pnpm-lock.yaml`, and source/config files only if direct runtime dependency migrations require them.

- [ ] **Step 1: Audit direct dependencies against actual imports and runtime needs**

Review the direct dependencies in `package.json` and repository imports. Upgrade maintained runtime packages such as `reflect-metadata`, `rxjs`, `passport`, `passport-jwt`, `passport-local`, `bcryptjs`, `dotenv`, `uuid`, and `rimraf` when compatible current stable releases are available and needed. Remove a direct dependency only when confirming it is unused and not required by scripts, Prisma generation/seeding, deployment, or transitive peer resolution. Avoid introducing new frameworks or replacing the existing architecture.

- [ ] **Step 2: Regenerate and inspect the canonical pnpm lockfile**

Run:

```bash
pnpm install
pnpm install --frozen-lockfile
git diff -- package.json pnpm-lock.yaml
```

Expected: normal install updates only the tracked manifest/lockfile for intentional selections; frozen install then succeeds. Do not stage, delete, or rewrite the untracked `yarn.lock`.

## Task 6: Final Integration Validation And Documentation

**Files:** `README.md`, `vercel.json`, and `package.json` only if a documented/runtime baseline change was approved or required by the selected versions.

- [ ] **Step 1: Document any required Node.js runtime baseline**

Declare Node.js 24 in `package.json` and `README.md`, because the selected NestJS 12 CLI and Prisma 7 toolchain require a modern Node runtime. Vercel supports Node 24; preserve the existing Vercel routing/build setup and do not add unsupported per-build Node settings.

- [ ] **Step 2: Run complete validation from a frozen install**

Run:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm exec prisma generate
pnpm build
pnpm lint
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
```

Expected: each command succeeds. If e2e tests need a database or secrets, report the exact missing prerequisite and distinguish that from an application/test failure. Do not claim success for an unrun or blocked check.

- [ ] **Step 3: Review final scope and preserve concurrent changes**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors; intended dependency/config/source/doc changes are present; `src/modules/auth/repository/accessToken.repository.ts` retains its pre-existing user modification; untracked `yarn.lock` remains unchanged. Review the schema and migrations diff to confirm no unintended data-model or migration changes.

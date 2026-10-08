# Household Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement secure multi-household membership, owner/member permissions, household-scoped APIs, and single-use invitation links without losing existing household relationships.

**Architecture:** Add a membership join model and invitation model, preserving integer database IDs while exposing UUID household IDs. Backfill current user-household links with the earliest-created member made owner. Add focused household, membership, invitation, and access services with DTOs and typed errors; enforce membership and last-owner rules server-side and transactionally.

**Tech Stack:** NestJS 12, Prisma 7, PostgreSQL, TypeScript, Jest/ts-jest.

---

## File Map

- `prisma/schema.prisma`: add public household UUID, membership and invitation models; later remove legacy `User.householdId`.
- `prisma/migrations/*`: additive schema/backfill migration first; legacy relationship removal only in a second migration.
- `src/modules/household/`: household controller, DTOs, service, membership controller/service, access service, typed feature errors, and tests.
- `src/modules/household/invitations/`: invitation controller, DTOs, service, token utilities, and tests.
- `src/modules/household/household.module.ts`: wire feature providers/controllers.
- `src/modules/users/users.module.ts`, `src/modules/auth/auth.module.ts`, `src/app.module.ts`: adjust provider ownership/imports only as needed to avoid duplicate providers and module cycles.
- `src/common/`: shared authenticated-principal typing or feature error filter only if needed; keep domain logic out of generic helpers.
- `prisma/seed/index.ts`: update test seed to create membership rows if seed data includes households.
- `docs/product/contracts/household-membership.md`: authoritative API behavior and client contract.
- `docs/superpowers/specs/2026-10-06-household-membership-implementation-design.md`: detailed design and rollout constraints.

## Task 1: Implement Pure Membership Policy With Tests

**Files:**
- Create: `src/modules/household/household-membership.service.ts`
- Create: `src/modules/household/household-membership.service.spec.ts`
- Create: `src/modules/household/household-domain.error.ts`

- [ ] **Step 1: Write failing owner/member policy tests**

Add focused tests for the following rules:

```ts
describe('HouseholdMembershipService.canDeleteMembership', () => {
  it('allows deleting an owner membership when another owner remains', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'OWNER',
        targetRole: 'OWNER',
        ownerCount: 2,
        isSelf: false,
      }),
    ).toEqual({ allowed: true });
  });

  it('rejects deleting the last owner membership', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'OWNER',
        targetRole: 'OWNER',
        ownerCount: 1,
        isSelf: false,
      }),
    ).toEqual({ allowed: false, code: 'LAST_OWNER_REQUIRED' });
  });

  it('allows members to delete only their own membership', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'MEMBER',
        targetRole: 'MEMBER',
        ownerCount: 1,
        isSelf: false,
      }),
    ).toEqual({ allowed: false, code: 'MEMBERSHIP_SELF_DELETE_ONLY' });
  });
});
```

- [ ] **Step 2: Run the policy test and confirm failure**

Run: `pnpm test -- --runInBand src/modules/household/household-membership.service.spec.ts`

Expected: FAIL because the service and policy are not implemented. This focused path must not be masked by the existing unrelated test failures.

- [ ] **Step 3: Implement pure policy and typed error**

Use the union `type HouseholdRole = 'OWNER' | 'MEMBER'`. Define a discriminated result with `{ allowed: true } | { allowed: false; code: 'LAST_OWNER_REQUIRED' | 'MEMBERSHIP_SELF_DELETE_ONLY' | 'HOUSEHOLD_OWNER_REQUIRED' }`. Implement a static/pure policy function without database access. Define `HouseholdDomainError` with `code` and a safe client message.

- [ ] **Step 4: Verify policy tests pass**

Run: `pnpm test -- --runInBand src/modules/household/household-membership.service.spec.ts`

Expected: all policy tests PASS.

## Task 2: Add Public Household IDs And Membership Backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: first new migration under `prisma/migrations/`
- Create or modify: `test/household-membership-migration.e2e-spec.ts` or a repository-standard disposable-DB migration check

- [ ] **Step 1: Create a legacy-data migration fixture**

Use a disposable PostgreSQL database containing two households and users linked through the current nullable `User.householdId`. For one household, create tied `createdAt` values so deterministic ID tie-breaking is verified. Assert source rows are preserved.

- [ ] **Step 2: Run the migration test and observe the missing-table failure**

Run the focused migration check before creating the migration.

Expected: FAIL because the membership table and public household ID do not exist.

- [ ] **Step 3: Add additive Prisma schema models**

Add `Household.publicId String @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid`. This gives existing rows a database-generated UUID in-place and creates a unique index. Add a membership role enum with `OWNER` and `MEMBER`. Add `HouseholdMembership` with internal ID, user/household foreign keys, role, `joinedAt`, nullable `leftAt`, unique `(userId, householdId)`, and indexes on both foreign keys. Keep `User.householdId` and its relation during this stage.

- [ ] **Step 4: Generate and inspect the additive migration**

Generate SQL without connecting to the configured Railway datasource:

```bash
DATABASE_URL='postgresql://localhost:5432/cobo' pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
```

Save the reviewed output as a new migration under `prisma/migrations/`. Include a deterministic backfill equivalent to:

```sql
INSERT INTO "HouseholdMembership" ("userId", "householdId", "role", "joinedAt")
SELECT ranked."id", ranked."householdId",
       CASE WHEN ranked.owner_rank = 1 THEN 'OWNER'::"HouseholdRole"
            ELSE 'MEMBER'::"HouseholdRole" END,
       ranked."createdAt"
FROM (
  SELECT "id", "householdId", "createdAt",
         ROW_NUMBER() OVER (
           PARTITION BY "householdId"
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS owner_rank
  FROM "User"
  WHERE "householdId" IS NOT NULL
) AS ranked;
```

Match the enum SQL type to Prisma's generated migration. Do not drop the legacy column in this migration.

- [ ] **Step 5: Verify migration and data invariants**

Run `pnpm exec prisma migrate deploy` against the disposable PostgreSQL database and the migration check.

Expected: every legacy non-null user-household link has exactly one membership; earliest user is owner (ID breaks timestamp ties); other users are members; no household/task/responsibility rows are deleted.

## Task 3: Implement Household Access And Membership Services

**Files:**
- Modify: `src/modules/household/household-membership.service.ts`
- Create: `src/modules/household/household-access.service.ts`
- Create: `src/modules/household/dto/update-membership-role.dto.ts`
- Add focused service tests in `src/modules/household/household-membership.service.spec.ts`

- [ ] **Step 1: Write failing access/lifecycle tests**

Cover member lookup by authenticated user and public household ID, owner-only role change, owner removal, self-leave, member self-delete-only, inactive membership rejection, and retained `leftAt` historical membership.

- [ ] **Step 2: Verify the focused tests fail**

Run: `pnpm test -- --runInBand src/modules/household/household-membership.service.spec.ts`

Expected: failures identify missing service methods/Prisma operations.

- [ ] **Step 3: Implement membership access lookup**

Add focused methods `requireMembership(userId, householdPublicId)` and `requireOwner(userId, householdPublicId)`. Resolve by public household UUID and current membership (`leftAt: null`). Never authorize using an ID supplied by the client alone.

- [ ] **Step 4: Implement role update and membership deletion transactionally**

Role changes accept only `OWNER`/`MEMBER`. Deletion is owner-removal when actor and target differ, or self-leave when they match. Use a transaction to read target/current owner count, run the pure policy, and set `leftAt`; do not hard-delete membership. The transaction must preserve at least one owner. A concurrency conflict that threatens the invariant returns `LAST_OWNER_REQUIRED`.

- [ ] **Step 5: Verify the focused tests pass**

Run: `pnpm test -- --runInBand src/modules/household/household-membership.service.spec.ts`

Expected: all membership access, policy, and lifecycle tests PASS.

## Task 4: Implement Household Create/List/Read And Member APIs

**Files:**
- Modify: `src/modules/household/household.controller.ts`
- Modify: `src/modules/household/household.service.ts`
- Create: `src/modules/household/household-membership.controller.ts`
- Create: `src/modules/household/dto/create-household.dto.ts`
- Create response DTOs under `src/modules/household/dto/`
- Modify: `src/modules/household/household.module.ts`

- [ ] **Step 1: Write failing household controller/service tests**

Test household creation with trimmed required display name and atomic initial owner membership, household listing for only current memberships, member count, details/members read authorization, and no email/phone disclosure to ordinary members.

- [ ] **Step 2: Run tests and confirm missing-operation failures**

Run the focused household controller/service test files.

Expected: FAIL because the current controller only echoes a request and the service is empty.

- [ ] **Step 3: Implement household create/list/read operations**

Create `Household` and initial `OWNER` membership in a single Prisma transaction. Return explicit DTOs with UUID `publicId` as `id`. Implement `GET /households`, `GET /households/:householdId`, and `GET /households/:householdId/members`. Return 404 for non-member household reads to avoid disclosing existence.

- [ ] **Step 4: Implement role patch and membership delete routes**

Use `PATCH /households/:householdId/members/:membershipId` and `DELETE /households/:householdId/members/:membershipId`. DTO validation permits only `OWNER` and `MEMBER`; controllers delegate to the services without embedding Prisma or owner-count logic.

- [ ] **Step 5: Verify household API tests pass**

Run focused tests for the household module.

Expected: create/list/read/member tests PASS with owner/member authorization enforced.

## Task 5: Add Invitation Persistence And Token Security Tests

**Files:**
- Modify: `prisma/schema.prisma`
- Create: second additive migration under `prisma/migrations/`
- Create: `src/modules/household/invitations/household-invitations.service.ts`
- Create: `src/modules/household/invitations/household-invitations.service.spec.ts`

- [ ] **Step 1: Write failing token/lifecycle tests**

Test token generation uses 32 cryptographically random bytes, storage uses SHA-256 of the raw token, expiry is exactly seven days, status precedence is revoked/accepted/expired/pending, and list/preview serialization never contains raw token/hash.

- [ ] **Step 2: Run the focused test and confirm missing-service failure**

Run: `pnpm test -- --runInBand src/modules/household/invitations/household-invitations.service.spec.ts`

Expected: FAIL because the invitation model/service is absent.

- [ ] **Step 3: Add invitation schema and generate additive migration**

Add `HouseholdInvitation` with household and creator foreign keys, unique `tokenHash`, `createdAt`, `expiresAt`, nullable `acceptedAt`, nullable `acceptedByUserId`, and nullable `revokedAt`. Add indexes that support household pending-list queries. Do not edit any existing migration SQL.

- [ ] **Step 4: Implement token helpers and status calculation**

Use Node `crypto.randomBytes(32).toString('base64url')`, store only `createHash('sha256').update(token).digest('hex')`, and derive status using revoked, accepted, expired, then pending precedence. Use an injectable clock or pass a `now` value to status logic so expiry tests are deterministic.

- [ ] **Step 5: Verify token/lifecycle tests pass**

Run the focused invitation service test.

Expected: token/hash/status tests PASS.

## Task 6: Implement Invitation Create/List/Revoke/Preview/Accept

**Files:**
- Create: `src/modules/household/invitations/household-invitations.controller.ts`
- Create: `src/modules/household/invitations/dto/create-invitation.dto.ts` if a body is introduced; otherwise no body DTO
- Create: `src/modules/household/invitations/dto/invitation-token.dto.ts`
- Modify: `src/modules/household/household.module.ts`
- Modify: `.env.example` if tracked/present, otherwise `README.md`

- [ ] **Step 1: Add failing tests for owner-only operations and minimal preview**

Test owner can create/list/revoke; member cannot; create returns raw URL once; list excludes token/hash/URL; preview returns household display name and expiry only; unknown token returns generic `INVITATION_NOT_FOUND`.

- [ ] **Step 2: Verify invitation endpoint tests fail first**

Run invitation service/controller tests.

Expected: FAIL for missing operations.

- [ ] **Step 3: Implement create/list/revoke operations**

Owner-check household before each operation. Read and validate `CLIENT_APP_URL` as an absolute HTTP(S) URL; append the invite route and URL-encoded token fragment. Fail with a typed configuration error when missing/invalid. Create persists only the hash and returns the raw link once. List returns ID/timestamps/derived pending status only. Revoke is idempotent when already revoked and rejects accepted invitations.

- [ ] **Step 4: Implement public invitation preview**

Expose `POST /invitation-previews` with token in the request body and `@Public()`. Resolve the hash, enforce pending/unexpired state, and return only household public ID/name, expiry, and status. Rate-limit token preview attempts using an existing project mechanism if available; otherwise use a bounded feature-local guard and record the policy in the contract.

- [ ] **Step 5: Implement transactional acceptance as membership creation**

Expose authenticated `POST /household-memberships` with token in the request body. In one transaction: resolve pending invitation by hash; if current membership exists, return it idempotently; otherwise create/reactivate membership as `MEMBER` and mark invitation accepted/by user. A concurrent different account receives `INVITATION_ALREADY_USED`; a concurrent same account receives the existing membership.

- [ ] **Step 6: Verify invitation endpoints and concurrency tests pass**

Run the focused invitation test suite against PostgreSQL.

Expected: create/list/revoke/preview/accept, expiry, replay, and concurrent-use tests PASS.

## Task 7: Module Wiring, Error Mapping, Migration Contract, And Docs

**Files:**
- Modify: `src/modules/household/household.module.ts`
- Modify: `src/modules/users/users.module.ts` and `src/modules/auth/auth.module.ts` only to avoid duplicated providers/cycles
- Modify or create: focused household exception filter/error mapper
- Modify: `prisma/seed/index.ts`
- Modify: `README.md`
- Modify: `docs/product/contracts/household-membership.md`

- [ ] **Step 1: Add AppModule compilation test with Prisma override**

Test that `AppModule` compiles without a database connection by overriding the Prisma provider and that household/auth/users providers resolve without circular module imports.

- [ ] **Step 2: Implement stable feature error mapping**

Map household domain error codes to the contract's statuses and `{ code, message }` response shape. Do not rewrite unrelated auth/users API error formats.

- [ ] **Step 3: Update seed behavior**

If seed creates a household, create its owner membership in the same logical seed flow. Keep seed credentials clearly development-only; do not use real account values beyond existing repo seed conventions.

- [ ] **Step 4: Document `CLIENT_APP_URL` and update actual contract details**

Add the setting to README environment documentation without including secret values. Update the contract's open decisions for pending-invitation listing, capacity, error envelope, contact verification, and former-member retention to the approved implementation decisions. Preserve REST routes: `/invitation-previews`, `POST /household-memberships`, and membership deletion for self-leave/owner removal.

- [ ] **Step 5: Run module tests, lint, and contract consistency checks**

Run focused AppModule tests, `pnpm lint`, and search the contract/spec for stale action-style invitation paths and `/members/me` paths.

Expected: module tests/lint pass; stale paths are absent.

## Task 8: Remove Legacy Household Foreign Key In A Separate Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: later contract migration under `prisma/migrations/`
- Modify: any source or tests that still use `User.householdId`

- [ ] **Step 1: Prove application reads and writes membership relations only**

Search `src/` and `prisma/seed/` for `user.householdId`. Update remaining application callers and tests to use memberships.

- [ ] **Step 2: Remove legacy field from the Prisma schema**

Remove `User.householdId` and its old relation from `schema.prisma`. Generate a new migration without editing prior migration files.

- [ ] **Step 3: Apply contract migration and validate retained data**

Run `pnpm exec prisma migrate deploy` against the PostgreSQL migration test database. Verify all former links remain represented by `HouseholdMembership` and no household-owned records disappeared.

## Task 9: Full Verification And Final Scope Review

**Files:** all feature files and docs above.

- [ ] **Step 1: Run frozen dependency install and generation**

Run: `pnpm install --frozen-lockfile`

Expected: install exits 0 and Prisma Client generation succeeds.

- [ ] **Step 2: Run schema validation, migration, build, and lint**

Run with test/development environment configured: `pnpm exec prisma validate`, `pnpm exec prisma migrate deploy`, `pnpm build`, and `pnpm lint`.

Expected: each exits 0.

- [ ] **Step 3: Run focused and full test suites**

Run all new household/invitation tests, `pnpm test -- --runInBand`, and `pnpm test:e2e -- --runInBand` against disposable PostgreSQL with test JWT values and `CLIENT_APP_URL` supplied as environment variables.

Expected: new feature tests pass. Report any known pre-existing baseline failures separately; do not claim the complete suite passes unless it does.

- [ ] **Step 4: Inspect schema, migrations, and repository changes**

Run `git diff --check`, inspect all generated migration SQL, and inspect `git status --short`. Confirm `.env` is not modified/staged, no secrets were added, old migration files are unchanged, legacy relationship removal is separate from backfill, and unrelated user edits are preserved.

Expected: only planned feature/design/contract files are modified and `git diff --check` is clean.

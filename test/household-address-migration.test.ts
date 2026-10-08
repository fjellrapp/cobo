import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { HouseholdService } from '../src/modules/household/household.service.js';

test('optional address migration preserves links and permits address-free households', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Temporary tables shadow public tables; this test never alters application data.
    await client.query(`
      CREATE TEMP TABLE "Address" ("id" INTEGER PRIMARY KEY);
      CREATE TEMP TABLE "Household" (
        "id" INTEGER PRIMARY KEY,
        "displayName" TEXT NOT NULL,
        CONSTRAINT "Household_id_fkey" FOREIGN KEY ("id") REFERENCES "Address"("id")
      );
      INSERT INTO "Address" VALUES (1);
      INSERT INTO "Household" VALUES (1, 'Existing home');
    `);
    const migration = await readFile(
      new URL(
        '../prisma/migrations/20261008130000_optional_household_address/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await client.query(migration);
    const existing = await client.query(
      'SELECT "addressId" FROM "Household" WHERE "id" = 1',
    );
    assert.equal(existing.rows[0].addressId, 1);
    await client.query(
      `INSERT INTO "Household" ("id", "displayName") VALUES (2, 'New home')`,
    );
    const created = await client.query(
      'SELECT "addressId" FROM "Household" WHERE "id" = 2',
    );
    assert.equal(created.rows[0].addressId, null);
    await assert.rejects(
      client.query('UPDATE "Household" SET "addressId" = 999 WHERE "id" = 2'),
      (error: { code?: string }) => error.code === '23503',
    );
    await client.query('DELETE FROM "Address" WHERE "id" = 1');
    const detached = await client.query(
      'SELECT "addressId" FROM "Household" WHERE "id" = 1',
    );
    assert.equal(detached.rows[0].addressId, null);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

test('name-only creation and owner membership succeed on the migrated database and roll back', async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const rollback = new Error('Intentional regression-test rollback');
  try {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({ select: { id: true } });
        assert.ok(
          user,
          'This configured-database regression requires an existing user',
        );
        const service = new HouseholdService(
          {
            $transaction: async (work: (transaction: typeof tx) => unknown) =>
              work(tx),
          } as never,
          {} as never,
        );
        const created = await service.create(
          user.id,
          ' Address-free regression household ',
        );
        assert.equal(created.displayName, 'Address-free regression household');
        assert.equal(created.membership.role, 'OWNER');
        const stored = await tx.household.findUniqueOrThrow({
          where: { publicId: created.id },
          select: {
            addressId: true,
            memberships: { select: { userId: true, role: true } },
          },
        });
        assert.equal(stored.addressId, null);
        assert.deepEqual(stored.memberships, [
          { userId: user.id, role: 'OWNER' },
        ]);
        throw rollback;
      }),
      (error) => error === rollback,
    );
  } finally {
    await prisma.$disconnect();
  }
});

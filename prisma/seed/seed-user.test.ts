import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare } from 'bcryptjs';
import { seedUserAccount } from './seed-user.js';

test('seed hashes new passwords and conditionally repairs only the known plaintext seed password', async () => {
  const account = {
    guid: 'seed-guid',
    phone: 'seed-phone',
    email: 'seed@example.test',
    firstName: 'Seed',
    lastName: 'User',
    password: 'test-only-password',
  };
  let created: typeof account | undefined;
  let repaired:
    | { where: { phone: string; password: string }; data: { password: string } }
    | undefined;
  const client = {
    user: {
      upsert: async (args: { update: object; create: typeof account }) => {
        assert.deepEqual(args.update, {});
        created = args.create;
        return { ...args.create, id: 1 };
      },
      updateMany: async (args: NonNullable<typeof repaired>) => {
        repaired = args;
        return { count: 1 };
      },
    },
  };
  await seedUserAccount(client as never, account);
  assert.ok(created);
  assert.notEqual(created.password, account.password);
  assert.equal(await compare(account.password, created.password), true);
  assert.ok(repaired);
  assert.deepEqual(repaired.where, {
    phone: account.phone,
    password: account.password,
  });
  assert.equal(await compare(account.password, repaired.data.password), true);
});

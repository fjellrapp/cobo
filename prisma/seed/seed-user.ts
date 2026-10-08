import { hash } from 'bcryptjs';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export async function seedUserAccount(
  client: PrismaClient,
  account: {
    guid: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
  },
) {
  const password = await hash(account.password, 10);
  const user = await client.user.upsert({
    where: { phone: account.phone },
    update: {},
    create: { ...account, password },
  });
  // Repair only the legacy seed's known plaintext value, never reset an existing hash.
  await client.user.updateMany({
    where: { phone: account.phone, password: account.password },
    data: { password },
  });
  return user;
}

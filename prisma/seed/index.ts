import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { randomUUID } from 'crypto';
import { seedUserAccount } from './seed-user.js';

const seedUser: {
  guid: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
} = {
  email: 'mats.hagen@gmail.com',
  phone: '92011453',
  firstName: 'Mats',
  lastName: 'Hagen',
  guid: randomUUID(),
  // Development fixture only; hashed before persistence.
  password: 'test',
};

const client = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const run = async () => {
  const user = await seedUserAccount(client, seedUser);

  const household = await client.household.upsert({
    where: { publicId: 'd8d9a278-9ea9-4c5d-9aaf-7e6cd34f56ad' },
    update: {},
    create: {
      publicId: 'd8d9a278-9ea9-4c5d-9aaf-7e6cd34f56ad',
      displayName: 'Test household',
    },
  });

  await client.householdMembership.upsert({
    where: {
      userId_householdId: { userId: user.id, householdId: household.id },
    },
    update: { role: 'OWNER', leftAt: null },
    create: { userId: user.id, householdId: household.id, role: 'OWNER' },
  });
};

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await client.$disconnect();
  });

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { randomUUID } from 'crypto';

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
  // Only for testing; resolves to 'test'
  password: 'test',
};

const client = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const run = async () => {
  await client.user.upsert({
    where: { phone: seedUser.phone },
    update: {},
    create: {
      firstName: seedUser.firstName,
      lastName: seedUser.lastName,
      email: seedUser.email,
      phone: seedUser.phone,
      guid: seedUser.guid,
      password: seedUser.password,
    },
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

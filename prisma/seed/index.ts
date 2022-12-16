import { PrismaClient } from '@prisma/client';
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
  password: '$2y$10$uOi8ZfhsivCKBgA9waYGx.71ByX98HAMvLRGM4E3jnLQR9qIL/jf6',
};

const client = new PrismaClient();

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

import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { HouseholdModule } from './modules/household/household.module.js';
import { PrismaModule } from './common/providers/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, HouseholdModule],
})
export class AppModule {}

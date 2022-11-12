import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HouseholdModule } from './modules/household/household.module';

@Module({
  imports: [AuthModule, UsersModule, HouseholdModule],
})
export class AppModule {}

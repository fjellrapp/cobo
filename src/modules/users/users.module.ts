import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { PrismaService } from 'src/common/providers/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  providers: [
    PrismaService,
    UsersService,
    BCryptService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

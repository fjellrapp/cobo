import { Module } from '@nestjs/common';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { PrismaService } from 'src/common/providers/prisma.service';
import { UsersService } from './users.service';

@Module({
  providers: [PrismaService, UsersService, BCryptService],
  exports: [UsersService],
})
export class UsersModule {}

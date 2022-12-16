import { Module } from '@nestjs/common';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { PrismaService } from 'src/common/providers/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  providers: [PrismaService, UsersService, BCryptService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

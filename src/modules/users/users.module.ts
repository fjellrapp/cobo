import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { PrismaService } from 'src/common/providers/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AccessTokenRepository } from '../auth/repository/accessToken.repository';
import { RefreshTokenRepositoy } from '../auth/repository/refreshToken.repository';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [
    PrismaService,
    UsersService,
    BCryptService,
    UsersRepository,
    AuthService,
    JwtService,
    RefreshTokenRepositoy,
    AccessTokenRepository,
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

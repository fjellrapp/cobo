import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { AccessTokenRepository } from '../auth/repository/accessToken.repository';
import { RefreshTokenRepositoy } from '../auth/repository/refreshToken.repository';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/providers/prisma.service';
import { BCryptService } from '../../common/providers/bcrypt.service';

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

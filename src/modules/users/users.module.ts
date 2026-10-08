import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service.js';
import { AccessTokenRepository } from '../auth/repository/accessToken.repository.js';
import { RefreshTokenRepositoy } from '../auth/repository/refreshToken.repository.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';
import { BCryptService } from '../../common/providers/bcrypt.service.js';

@Module({
  providers: [
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

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenRepository } from './repository/accessToken.repository.js';
import { RefreshTokenRepositoy } from './repository/refreshToken.repository.js';
import { RefreshTokenStrategy } from './strategy/jwt-r.strategy.js';
import { AccessTokenStrategy } from './strategy/jwt.strategy.js';
import { LocalStrategy } from './strategy/local.strategy.js';
import { BCryptService } from '../../common/providers/bcrypt.service.js';

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    BCryptService,
    LocalStrategy,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    AccessTokenRepository,
    RefreshTokenRepositoy,
  ],
})
export class AuthModule {}

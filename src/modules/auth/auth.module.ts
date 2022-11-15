import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenRepository } from './repository/accessToken.repository';
import { RefreshTokenRepositoy } from './repository/refreshToken.repository';
import { RefreshTokenStrategy } from './strategy/jwt-r.strategy';
import { AccessTokenStrategy } from './strategy/jwt.strategy';
import { LocalStrategy } from './strategy/local.strategy';

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

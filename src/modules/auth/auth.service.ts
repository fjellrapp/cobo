import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { RefreshToken } from 'src/common/utils/types/refreshToken.type';
import { UsersService } from '../users/users.service';
import { jwtConstants } from './constants';
import { AccessTokenRepository } from './repository/accessToken.repository';
import { RefreshTokenRepositoy } from './repository/refreshToken.repository';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private bcryptService: BCryptService,
    private jwtService: JwtService,
    private refreshTokenRepo: RefreshTokenRepositoy,
    private accessTokenRepo: AccessTokenRepository,
  ) {}

  async validateUser(phonenumber: string, pass: string): Promise<any> {
    const user = await this.usersService.getByPhone(phonenumber);
    const compareResult = await this.bcryptService.compareWithHash(
      pass,
      user.password,
    );
    if (user && compareResult) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const { access_token, refresh_token } = await this.getTokens(user);

    await this.validateUserRefreshToken(user, refresh_token);

    return {
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }

  async signup(user: User) {
    if (await this.usersService.getByPhone(user.phone)) {
      throw new Error('A user with this phonenumber already exists');
    }
    return this.usersService.create(user);
  }

  async signOut(user: User) {
    await this.updateUserRefreshToken(user, null);
  }

  async updateUserRefreshToken(user: User, refreshToken: string) {
    return await this.usersService.update(user, {
      ...user,
      refreshToken: refreshToken,
    });
  }

  async validateUserRefreshToken(user: User, refreshToken: string) {
    if (!user.refreshToken) {
      const hashedToken = await this.encryptRefreshToken(refreshToken);
      if (!(hashedToken instanceof Error)) {
        await this.updateUserRefreshToken(user, hashedToken);
      }
    } else {
      const isMatch = this.hashedTokenMatched(refreshToken, user.refreshToken);
      if (isMatch) {
        try {
          const token = await this.jwtService.verifyAsync<RefreshToken>(
            refreshToken,
            { secret: jwtConstants.refresh_secret },
          );
          return token;
        } catch (e) {
          console.log(`Catched an error in validateUserRefreshToken, ${e}`);
        }
      }
    }
  }

  async encryptRefreshToken(token: string) {
    return await this.bcryptService.hash(token, 10);
  }
  async hashedTokenMatched(token: string, hash: string) {
    return await this.bcryptService.compareWithHash(token, hash);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.getById(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }
    const refreshTokenMatches = this.bcryptService.compareWithHash(
      user.refreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.getTokens(user);
    try {
      await this.updateUserRefreshToken(user, tokens.refresh_token);
      return tokens;
    } catch (e) {
      throw new InternalServerErrorException('500');
    }
  }

  async getTokens(user: User) {
    const access_token = await this.accessTokenRepo.generateAccessToken(user);
    const refresh_token = await this.refreshTokenRepo.createRefreshToken(user);

    return { access_token, refresh_token };
  }

  async getGuid(token: string) {
    const guid = await this.accessTokenRepo.decryptGuidFromAccessToken(token);
    return guid;
  }
}

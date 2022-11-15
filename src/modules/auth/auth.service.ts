import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
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
    const user = await this.usersService.findOneByPhone(phonenumber);
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
    const { accessToken, refreshToken } = await this.getTokens(user);

    await this.validateUserRefreshToken(user, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async signup(user: User) {
    if (await this.usersService.findOneByPhone(user.phone)) {
      throw new Error('A user with this phonenumber already exists');
    }
    return this.usersService.createOne(user);
  }

  async signOut(user: User) {
    await this.updateUserRefreshToken(user, null);
  }

  async updateUserRefreshToken(user: User, refreshToken: string) {
    return await this.usersService.updateOne(user, {
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
      const isSameToken = this.hashedTokenMatched(
        refreshToken,
        user.refreshToken,
      );
      if (isSameToken) {
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
  async hashedTokenMatched(token: string, hash) {
    return await this.bcryptService.compareWithHash(token, hash);
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.usersService.findOneById(userId);
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
      await this.updateUserRefreshToken(user, tokens.refreshToken);
      return tokens;
    } catch (e) {
      throw new InternalServerErrorException('500');
    }
  }

  async getTokens(user: User) {
    const accessToken = await this.accessTokenRepo.generateAccessToken(user);
    const refreshToken = await this.refreshTokenRepo.createRefreshToken(user);

    return { accessToken, refreshToken };
  }
}

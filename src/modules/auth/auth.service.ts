import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { UsersService } from '../users/users.service';
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
    const accessToken = this.accessTokenRepo.generateAccessToken(user);
    const refreshToken = this.refreshTokenRepo.createRefreshToken(
      user,
      10 * 10 * 60 * 60,
    );
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
}

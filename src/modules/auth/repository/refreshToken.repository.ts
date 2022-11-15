import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { RefreshToken } from 'src/common/utils/types/refreshToken.type';
import { jwtConstants } from '../constants';

@Injectable()
export class RefreshTokenRepositoy {
  constructor(private jwtService: JwtService) {}
  async createRefreshToken(user: User): Promise<string> {
    const token: RefreshToken = {
      userId: 0,
      isRevoked: false,
    };
    token.userId = user.id;

    const signedToken = await this.jwtService.signAsync(token, {
      secret: jwtConstants.refresh_secret,
      expiresIn: '7d',
    });
    return signedToken;
  }
}

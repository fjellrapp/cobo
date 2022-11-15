import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { RefreshToken } from 'src/common/utils/types/refreshToken.type';

@Injectable()
export class RefreshTokenRepositoy {
  constructor(private jwtService: JwtService) {}
  async createRefreshToken(user: User, ttl: number): Promise<string> {
    const token: RefreshToken = {
      userId: 0,
      isRevoked: false,
      expires: undefined,
    };
    token.userId = user.id;

    const expiration = new Date();
    expiration.setTime(expiration.getTime() + ttl);

    token.expires = expiration;

    const signedToken = this.jwtService.sign(token);
    return signedToken;
  }
}

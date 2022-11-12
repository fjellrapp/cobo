import { Injectable } from '@nestjs/common';
import { RefreshToken, User } from '@prisma/client';
import client from 'prisma/client';

@Injectable()
export class RefreshTokenRepositoy {
  async createRefreshToken(user: User, ttl: number): Promise<RefreshToken> {
    const token: RefreshToken = {
      id: 0,
      userId: user.id,
      hash: '',
      isRevoked: false,
      expires: undefined,
    };

    token.userId = user.id;

    const expiration = new Date();
    expiration.setTime(expiration.getTime() + ttl);

    token.expires = expiration;
    return token;
  }

  async findByTokenId(id: number): Promise<RefreshToken> {
    return client.refreshToken.findUnique({ where: { id } });
  }
}

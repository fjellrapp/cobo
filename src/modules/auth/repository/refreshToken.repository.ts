import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../../generated/prisma/client.js';
import { RefreshToken } from '../../../common/utils/types/refreshToken.type.js';
import { jwtConstants } from '../constants/index.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RefreshTokenRepositoy {
  constructor(private jwtService: JwtService) {}
  async createRefreshToken(user: User): Promise<string> {
    const token: RefreshToken = {
      userGuid: user.guid,
      isRevoked: false,
    };

    const signedToken = await this.jwtService.signAsync(token, {
      secret: jwtConstants.refresh_secret,
      expiresIn: '30d',
      jwtid: randomUUID(),
    });
    return signedToken;
  }
}

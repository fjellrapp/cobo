import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../../generated/prisma/client.js';
import { jwtConstants } from '../constants/index.js';

@Injectable()
export class AccessTokenRepository {
  constructor(private jwtService: JwtService) {}
  async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: String(user.id),
      guid: user.guid,
      phone: user.phone,
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: jwtConstants.access_secret,
      expiresIn: '1m',
    });
    return token;
  }

  decryptGuidFromAccessToken(token: string): Promise<string> {
    const omittedBearer = token.split(' ')[1];
    const decrypted = this.jwtService.decode(omittedBearer, { json: true });
    if (decrypted['guid']) {
      return decrypted['guid'];
    }
    return null;
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { jwtConstants } from '../constants';

@Injectable()
export class AccessTokenRepository {
  constructor(private jwtService: JwtService) {}
  async generateAccessToken(user: User): Promise<string> {
    console.log('user.guid', user);
    const payload = {
      guid: user.guid,
      phone: user.phone,
      password: user.password,
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

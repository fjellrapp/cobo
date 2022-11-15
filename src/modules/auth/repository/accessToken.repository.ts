import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { jwtConstants } from '../constants';

@Injectable()
export class AccessTokenRepository {
  constructor(private jwtService: JwtService) {}
  async generateAccessToken(user: User): Promise<string> {
    const payload = { phone: user.phone, password: user.password };
    const token = await this.jwtService.signAsync(payload, {
      secret: jwtConstants.access_secret,
      expiresIn: '15m',
    });
    return token;
  }
}

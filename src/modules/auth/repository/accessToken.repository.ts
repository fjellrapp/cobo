import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AccessTokenRepository {
  constructor(private jwtService: JwtService) {}
  async generateAccessToken(user: User): Promise<string> {
    const payload = { phone: user.phone, password: user.password };
    const token = this.jwtService.sign(payload);
    return token;
  }
}

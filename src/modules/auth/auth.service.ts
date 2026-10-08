import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../generated/prisma/client.js';
import { BCryptService } from '../../common/providers/bcrypt.service.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { UsersService } from '../users/users.service.js';
import { AccessTokenRepository } from './repository/accessToken.repository.js';
import { RefreshTokenRepositoy } from './repository/refreshToken.repository.js';

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
    const user = await this.usersService.getByPhone(phonenumber);
    if (!user) return null;
    const compareResult = await this.bcryptService.compareWithHash(
      pass,
      user.password,
    );
    if (compareResult) {
      return user;
    }
    return null;
  }

  async login(user: Partial<User>) {
    const currentUser = await this.validateUser(user.phone, user.password);
    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid phone number or password.',
      });
    }
    const tokens = await this.getTokens(currentUser);
    await this.usersService.setRefreshToken(
      currentUser.guid,
      this.refreshDigest(tokens.refresh_token),
    );
    return tokens;
  }

  async signup(user: User) {
    const [existingPhone, existingEmail] = await Promise.all([
      this.usersService.getByPhone(user.phone),
      this.usersService.getByEmail(user.email),
    ]);
    if (existingPhone || existingEmail) {
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'An account with this email or phone number already exists.',
      });
    }
    return this.usersService.create(user);
  }

  async signOut(user: User) {
    await this.usersService.setRefreshToken(user.guid, null);
  }

  private refreshDigest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.getById(userId);
    const digest = this.refreshDigest(refreshToken);
    if (
      !user ||
      !user.refreshToken ||
      user.refreshToken.length !== digest.length ||
      !timingSafeEqual(Buffer.from(user.refreshToken), Buffer.from(digest))
    ) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Please sign in again.',
      });
    }
    const tokens = await this.getTokens(user);
    // Compare-and-swap prevents a replay or parallel refresh from rotating twice.
    const rotated = await this.usersService.rotateRefreshToken(
      user.guid,
      digest,
      this.refreshDigest(tokens.refresh_token),
    );
    if (!rotated) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Please sign in again.',
      });
    }
    return tokens;
  }

  async getTokens(user: User) {
    const access_token = await this.accessTokenRepo.generateAccessToken(user);
    const refresh_token = await this.refreshTokenRepo.createRefreshToken(user);

    return { access_token, refresh_token };
  }

  async getGuid(token: string) {
    const guid = await this.accessTokenRepo.decryptGuidFromAccessToken(token);
    return guid;
  }
}

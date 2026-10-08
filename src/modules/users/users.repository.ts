import { BadRequestException, Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { randomUUID } from 'crypto';
import { BCryptService } from '../../common/providers/bcrypt.service.js';
import { PrismaService } from '../../common/providers/prisma.service.js';

@Injectable()
export class UsersRepository {
  constructor(
    private prismaService: PrismaService,
    private bcryptService: BCryptService,
  ) {}

  async findOneByPhone(phonenumber: string): Promise<User | undefined> {
    return this.prismaService.user.findUnique({
      where: {
        phone: phonenumber,
      },
    });
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async findOneById(guid: string): Promise<User | undefined> {
    return this.prismaService.user.findUnique({
      where: {
        guid,
      },
    });
  }
  async createOne(user: User): Promise<void> {
    const encryptedPw = await this.bcryptService.hash(user.password);
    if (!encryptedPw) {
      throw new Error('Password hashing failed.');
    }

    await this.prismaService.user.create({
      data: {
        ...user,
        guid: randomUUID(),
        password: encryptedPw,
      },
    });
  }

  async updateOne(user: User, update: User): Promise<any> {
    try {
      await this.prismaService.user.update({
        where: { phone: user.phone },
        data: {
          ...update,
        },
      });
    } catch (err: unknown) {
      throw new BadRequestException(
        `Noe gikk galt under oppdatering av bruker: ${err}`,
      );
    }
  }

  async setRefreshToken(guid: string, digest: string | null) {
    await this.prismaService.user.update({
      where: { guid },
      data: { refreshToken: digest },
    });
  }

  async rotateRefreshToken(
    guid: string,
    previousDigest: string,
    nextDigest: string,
  ) {
    const result = await this.prismaService.user.updateMany({
      where: { guid, refreshToken: previousDigest },
      data: { refreshToken: nextDigest },
    });
    return result.count === 1;
  }
}

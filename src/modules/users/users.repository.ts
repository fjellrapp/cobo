import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BCryptService } from '../../common/providers/bcrypt.service';
import { PrismaService } from '../../common/providers/prisma.service';

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

  async findOneById(guid: string): Promise<User | undefined> {
    return this.prismaService.user.findUnique({
      where: {
        guid,
      },
    });
  }
  async createOne(user: User): Promise<void> {
    try {
      const encryptedPw = await this.bcryptService.hash(user.password);
      if (encryptedPw) {
        user = {
          ...user,
          guid: randomUUID(),
          password: encryptedPw,
        };
      }
      try {
        await this.prismaService.user.create({ data: user });
      } catch (e: unknown) {
        throw new Error(`${e}`);
      }
    } catch (e) {
      throw new Error(`${e}`);
    }
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
}

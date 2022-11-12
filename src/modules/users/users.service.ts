import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { PrismaService } from 'src/common/providers/prisma.service';

@Injectable()
export class UsersService {
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

  async createOne(user: User): Promise<User | undefined> {
    const encryptedPw = await this.bcryptService.hash(user.password);
    if (encryptedPw && !(encryptedPw instanceof Error)) {
      user = {
        ...user,
        password: encryptedPw,
      };
    }
    try {
      return await this.prismaService.user.create({ data: user });
    } catch (e) {
      console.log('ERRR', e);
    }
  }
}

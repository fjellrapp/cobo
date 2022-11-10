import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { BCryptService } from 'src/common/providers/bcrypt.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private bcryptService: BCryptService,
    private jwtService: JwtService,
  ) {}

  async validateUser(phonenumber: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(phonenumber);
    const compareResult = await this.bcryptService.compareWithHash(
      pass,
      user.password,
    );
    if (user && compareResult) {
      return user;
    }
    return null;
  }

  async login(user: { phonenumber: string; pass: string }) {
    const payload = { phone: user.phonenumber, password: user.pass };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async signup(user: User) {
    if (await this.usersService.findOne(user.phone)) {
      throw new Error('A user with this phonenumber already exists');
    }
    return this.usersService.createOne(user);
  }
}

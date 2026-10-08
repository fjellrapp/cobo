import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import type { User } from '../../generated/prisma/client.js';

@Controller('users')
export class UsersController {
  constructor(
    private service: UsersService,
    private authService: AuthService,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Get('getByPhone/:phone')
  async getByPhone(@Req() request: Request, @Res() res: Response) {
    const phone = request.params.phone as string;
    try {
      const user = await this.service.getByPhone(phone);
      if (!user) return res.status(404).send({ message: 'User not found.' });
      return res.status(200).send(this.profile(user));
    } catch {
      res.status(404).send('Fant ingen bruker med dette telefonnummeret');
    }
    res.status(200).send('ok');
  }

  @UseGuards(JwtAuthGuard)
  @Get('getCurrentUser')
  async getCurrentUser(@Req() request: Request, @Res() res: Response) {
    try {
      const token = request.headers.authorization;
      const guid = await this.authService.getGuid(token);
      const user = await this.service.getById(guid);
      if (!user)
        return res.status(401).send({ message: 'Please sign in again.' });
      return res.status(200).send(this.profile(user));
    } catch (e: unknown) {
      if (e instanceof Error) {
        return res.status(401).send(e);
      }
      return res.status(401).send(e);
    }
  }

  private profile(user: User) {
    return {
      guid: user.guid,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}

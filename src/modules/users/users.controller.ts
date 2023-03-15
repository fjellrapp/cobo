import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private service: UsersService,
    private authService: AuthService,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Get('getByPhone/:phone')
  async getByPhone(@Req() request: Request, @Res() res: Response) {
    const phone = request.params?.phone;
    try {
      const user = await this.service.getByPhone(phone);
      return res.status(200).send(user);
    } catch (err) {
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
      return res.status(200).send(user);
    } catch (e: unknown) {
      if (e instanceof Error) {
        return res.status(401).send(e);
      }
      return res.status(401).send(e);
    }
  }
}

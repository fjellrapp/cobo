import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}
  @Get('getByPhone/:phone')
  async getByPhone(@Req() request: Request, @Res() res: Response) {
    const phone = request.params?.phone;
    try {
      const user = await this.service.findOneByPhone(phone);
      console.log('user', user);
      return res.status(200).send(user);
    } catch (err) {
      res.status(404).send('Fant ingen bruker med dette telefonnummeret');
    }

    res.status(200).send('ok');
  }
}

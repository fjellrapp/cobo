import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}
  @Get('getByPhone')
  async getByPhone(@Req() request: Request, @Res() res: Response) {
    res.status(200).send('ok');
  }
}

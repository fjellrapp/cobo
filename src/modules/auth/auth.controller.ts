import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';
import { isUser } from 'src/common/utils/guards';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    try {
      const user = req.user as User;
      const token = await this.service.login({
        phonenumber: user.phone,
        pass: user.password,
      });
      return token;
    } catch (e) {
      console.log('err, ', e);
    }
  }

  @Post('signup')
  async signup(@Body() user: User, @Res() res: Response) {
    if (!isUser(user)) {
      res.status(HttpStatus.BAD_REQUEST).send(`Please pass in a user object`);
    }
    try {
      const result = await this.service.signup(user);
      res.status(HttpStatus.CREATED).send(result);
    } catch (e: unknown) {
      res.status(HttpStatus.BAD_REQUEST).send(e);
    }
  }
}

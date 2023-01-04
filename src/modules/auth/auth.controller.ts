import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  HttpStatus,
  Request,
  Get,
  Req,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';
import { Public } from 'src/common/utils/decorators/public';
import { isUser } from 'src/common/utils/guards';
import { RefreshToken } from 'src/common/utils/types/refreshToken.type';
import { AuthService } from './auth.service';
import { JwtRefreshAuthGuard } from './guards/jwtr-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req,
    @Res() res,
  ): Promise<{ access_token: string; refresh_token: string } | Error> {
    try {
      const user = req.user as User;
      const token = await this.service.login(user);
      console.log('Token', token);
      res.status(HttpStatus.OK).send(token);
    } catch (e: unknown) {
      if (e instanceof Error) {
        return e;
      } else {
        return new Error(`New error: ${e}`);
      }
    }
  }

  @Public()
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

  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refreshTokens(@Req() req: Request, @Res() res: Response) {
    const { userGuid, refreshToken } = (req as any).user as RefreshToken;
    try {
      const refreshed = await this.service.refresh(userGuid, refreshToken);
      if (refreshed) {
        res.status(HttpStatus.OK).send(refreshed);
      }
    } catch (e) {
      res.status(HttpStatus.BAD_REQUEST).send(e);
    }
  }
}

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
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';
import { Public } from '../../common/utils/decorators/public';
import { isUser } from '../../common/utils/guards';
import { RefreshToken } from '../../common/utils/types/refreshToken.type';
import { AuthService } from './auth.service';
import { JwtRefreshAuthGuard } from './guards/jwtr-auth.guard';
import { isError } from '../../shared/utils/errors/isError';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Request() req,
    @Res() res,
  ): Promise<{ access_token: string; refresh_token: string } | Error> {
    try {
      const user = req.body as Partial<User>;
      const token = await this.service.login(user);
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
      return res.status(HttpStatus.CREATED).send(result);
    } catch (e: unknown) {
      if (isError(e)) {
        throw new ForbiddenException({
          status: HttpStatus.FORBIDDEN,
          error: e.message,
        });
      }
      throw new BadRequestException(`An unknown error was thrown: ${e}`);
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

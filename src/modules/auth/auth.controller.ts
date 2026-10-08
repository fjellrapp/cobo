import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  HttpStatus,
  ConflictException,
  InternalServerErrorException,
  Request,
  Get,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Response } from 'express';
import { Public } from '../../common/utils/decorators/public.js';
import { isUser } from '../../common/utils/guards/index.js';
import { RefreshToken } from '../../common/utils/types/refreshToken.type.js';
import { AuthService } from './auth.service.js';
import { JwtRefreshAuthGuard } from './guards/jwtr-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Public()
  @Post('login')
  async login(@Request() req, @Res() res) {
    const body = req.body;
    if (
      !body ||
      typeof body.phone !== 'string' ||
      !body.phone.trim() ||
      typeof body.password !== 'string' ||
      !body.password ||
      body.phone.length > 64 ||
      body.password.length > 1024
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Phone number and password are required.',
      });
    }
    const token = await this.service.login({
      phone: body.phone.trim(),
      password: body.password,
    });
    return res.status(HttpStatus.OK).send(token);
  }

  @Public()
  @Post('signup')
  async signup(@Body() user: User, @Res() res: Response) {
    if (!isUser(user)) {
      throw new BadRequestException('Please pass in a valid user object.');
    }
    try {
      const result = await this.service.signup(user);
      return res.status(HttpStatus.CREATED).send(result);
    } catch (e: unknown) {
      if (e instanceof ConflictException) {
        throw e;
      }
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'ACCOUNT_ALREADY_EXISTS',
          message: 'An account with this email or phone number already exists.',
        });
      }
      throw new InternalServerErrorException({
        code: 'SIGNUP_FAILED',
        message: 'Unable to create account right now.',
      });
    }
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refreshTokens(@Req() req: Request, @Res() res: Response) {
    const { userGuid, refreshToken } = (req as any).user as RefreshToken;
    const refreshed = await this.service.refresh(userGuid, refreshToken);
    return res.status(HttpStatus.OK).send(refreshed);
  }
}

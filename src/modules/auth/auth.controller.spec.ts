import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { expect, jest } from '@jest/globals';
import { AuthController } from './auth.controller.js';

describe('AuthController.signup', () => {
  const validUser = {
    email: 'person@example.test',
    phone: '+15555550123',
    firstName: 'Test',
    lastName: 'Person',
    password: 'correct horse battery staple',
  } as never;

  it('returns a conflict for an existing email or phone', async () => {
    const service = {
      signup: jest
        .fn()
        .mockRejectedValue(new ConflictException('Account already exists')),
    };
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const controller = new AuthController(service as never);

    await expect(
      controller.signup(validUser, response as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not convert unexpected persistence errors into forbidden responses', async () => {
    const service = {
      signup: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const controller = new AuthController(service as never);

    await expect(
      controller.signup(validUser, response as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('returns bad request for an invalid signup body', async () => {
    const service = { signup: jest.fn() };
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const controller = new AuthController(service as never);

    await expect(
      controller.signup({} as never, response as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.signup).not.toHaveBeenCalled();
  });
});

describe('AuthController.login', () => {
  it('propagates a credential failure instead of leaving the response unfinished', async () => {
    const service = {
      login: jest.fn().mockRejectedValue(new UnauthorizedException()),
    };
    const controller = new AuthController(service as never);
    await expect(
      controller.login(
        { body: { phone: '123', password: 'wrong' } } as never,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    {},
    { phone: '123' },
    { phone: 123, password: 'x' },
    { phone: '', password: 'x' },
    { phone: '123', password: '' },
  ])('rejects invalid credentials payload %j', async (body) => {
    const service = { login: jest.fn() };
    const controller = new AuthController(service as never);
    await expect(
      controller.login({ body } as never, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.login).not.toHaveBeenCalled();
  });
});

describe('AuthController.refresh', () => {
  it('propagates rejected refresh as unauthorized', async () => {
    const service = {
      refresh: jest.fn().mockRejectedValue(new UnauthorizedException()),
    };
    const controller = new AuthController(service as never);
    const response = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await expect(
      controller.refreshTokens(
        { user: { userGuid: 'guid', refreshToken: 'token' } } as never,
        response as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

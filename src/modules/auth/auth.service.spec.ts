import { expect, jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service.js';

describe('AuthService.signup', () => {
  it('rejects an existing phone number with a conflict', async () => {
    const usersService = {
      getByPhone: jest.fn().mockResolvedValue({ id: 4 }),
      getByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const service = new AuthService(
      usersService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.signup({
        phone: '+15555550123',
        email: 'new@example.test',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an existing email with a conflict', async () => {
    const usersService = {
      getByPhone: jest.fn().mockResolvedValue(null),
      getByEmail: jest.fn().mockResolvedValue({ id: 4 }),
      create: jest.fn(),
    };
    const service = new AuthService(
      usersService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.signup({
        phone: '+15555550123',
        email: 'existing@example.test',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService credentials and refresh', () => {
  const user = {
    id: 4,
    guid: 'user-guid',
    phone: '+15555550123',
    password: 'password-hash',
  };
  const digest = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  function setup() {
    const users = {
      getByPhone: jest.fn().mockResolvedValue(user),
      getById: jest
        .fn()
        .mockResolvedValue({ ...user, refreshToken: digest('old-refresh') }),
      setRefreshToken: jest.fn().mockResolvedValue(undefined),
      rotateRefreshToken: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const bcrypt = { compareWithHash: jest.fn().mockResolvedValue(true) };
    const refresh = {
      createRefreshToken: jest.fn().mockResolvedValue('new-refresh'),
    };
    const access = {
      generateAccessToken: jest.fn().mockResolvedValue('new-access'),
    };
    const service = new AuthService(
      users as never,
      bcrypt as never,
      {} as never,
      refresh as never,
      access as never,
    );
    return { service, users, bcrypt, refresh, access };
  }

  it('rejects a wrong password before generating tokens', async () => {
    const { service, bcrypt, access } = setup();
    bcrypt.compareWithHash.mockResolvedValue(false);
    await expect(
      service.login({ phone: user.phone, password: 'wrong' } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(access.generateAccessToken).not.toHaveBeenCalled();
  });

  it('rejects an unknown account with the same status', async () => {
    const { service, users, access } = setup();
    users.getByPhone.mockResolvedValue(null);
    await expect(
      service.login({ phone: user.phone, password: 'wrong' } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(access.generateAccessToken).not.toHaveBeenCalled();
  });

  it('checks the unmodified password and persists a full-token digest', async () => {
    const { service, bcrypt, users } = setup();
    await expect(
      service.login({ phone: user.phone, password: ' password ' } as never),
    ).resolves.toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
    expect(bcrypt.compareWithHash).toHaveBeenCalledWith(
      ' password ',
      'password-hash',
    );
    expect(users.setRefreshToken).toHaveBeenCalledWith(
      'user-guid',
      digest('new-refresh'),
    );
  });

  it('does not issue a successful login if token persistence fails', async () => {
    const { service, users } = setup();
    users.setRefreshToken.mockRejectedValue(new Error('database unavailable'));
    await expect(
      service.login({ phone: user.phone, password: 'password' } as never),
    ).rejects.toThrow();
  });

  it('rejects refresh tokens that do not match the stored digest', async () => {
    const { service, access } = setup();
    await expect(
      service.refresh('user-guid', 'wrong-refresh'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(access.generateAccessToken).not.toHaveBeenCalled();
  });

  it('rotates refresh tokens using a conditional digest update', async () => {
    const { service, users } = setup();
    await expect(service.refresh('user-guid', 'old-refresh')).resolves.toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
    expect(users.rotateRefreshToken).toHaveBeenCalledWith(
      'user-guid',
      digest('old-refresh'),
      digest('new-refresh'),
    );
  });

  it('rejects a refresh race lost to another rotation', async () => {
    const { service, users } = setup();
    users.rotateRefreshToken.mockResolvedValue(false);
    await expect(
      service.refresh('user-guid', 'old-refresh'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects legacy stored refresh hashes and missing accounts', async () => {
    const { service, users } = setup();
    users.getById.mockResolvedValue({ ...user, refreshToken: '$2b$legacy' });
    await expect(
      service.refresh('user-guid', 'old-refresh'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    users.getById.mockResolvedValue(null);
    await expect(
      service.refresh('user-guid', 'old-refresh'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

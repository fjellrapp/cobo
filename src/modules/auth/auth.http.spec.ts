import { expect, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BCryptService } from '../../common/providers/bcrypt.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { UsersController } from '../users/users.controller.js';
import { AccessTokenRepository } from './repository/accessToken.repository.js';
import { RefreshTokenRepositoy } from './repository/refreshToken.repository.js';
import { AccessTokenStrategy } from './strategy/jwt.strategy.js';
import { RefreshTokenStrategy } from './strategy/jwt-r.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtRefreshAuthGuard } from './guards/jwtr-auth.guard.js';
import { jwtConstants } from './constants/index.js';
import { HouseholdController } from '../household/household.controller.js';
import { HouseholdService } from '../household/household.service.js';

describe('Authentication HTTP contract (in-memory persistence)', () => {
  let app: INestApplication;
  let user: any;
  const original = { ...jwtConstants };

  beforeAll(async () => {
    jwtConstants.access_secret = 'http-test-access-secret';
    jwtConstants.refresh_secret = 'http-test-refresh-secret';
    const bcrypt = new BCryptService();
    user = {
      id: 1,
      guid: 'http-test-guid',
      phone: '12345678',
      email: 'ada@example.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: await bcrypt.hash('correct-password'),
      refreshToken: null,
    };
    const users = {
      getByPhone: jest.fn(async (phone) =>
        phone === user.phone ? user : null,
      ),
      getById: jest.fn(async (guid) => (guid === user.guid ? user : null)),
      setRefreshToken: jest.fn(async (_guid, digest) => {
        user.refreshToken = digest;
      }),
      rotateRefreshToken: jest.fn(async (_guid, previous, next) => {
        if (user.refreshToken !== previous) return false;
        user.refreshToken = next;
        return true;
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [AuthController, UsersController, HouseholdController],
      providers: [
        AuthService,
        BCryptService,
        JwtService,
        Reflector,
        AccessTokenRepository,
        RefreshTokenRepositoy,
        AccessTokenStrategy,
        RefreshTokenStrategy,
        JwtAuthGuard,
        JwtRefreshAuthGuard,
        { provide: UsersService, useValue: users },
        {
          provide: HouseholdService,
          useValue: {
            listMine: (userId: number) => ({
              items: [],
              authenticatedUserId: userId,
            }),
            create: (userId: number, displayName: string) => ({
              id: 'household',
              displayName,
              authenticatedUserId: userId,
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    Object.assign(jwtConstants, original);
  });

  it('rejects wrong and unknown credentials, validates bodies, and protects profiles', async () => {
    const server = app.getHttpServer();
    const wrong = await request(server)
      .post('/auth/login')
      .send({ phone: '12345678', password: 'wrong' })
      .expect(401);
    const missing = await request(server)
      .post('/auth/login')
      .send({ phone: 'unknown', password: 'wrong' })
      .expect(401);
    expect(wrong.body).toEqual(missing.body);
    await request(server)
      .post('/auth/login')
      .send({ phone: '12345678' })
      .expect(400);
    await request(server).get('/users/getCurrentUser').expect(401);
  });

  it('logs in, returns safe profile, rotates signed refresh tokens and rejects replay', async () => {
    const server = app.getHttpServer();
    const login = await request(server)
      .post('/auth/login')
      .send({ phone: '12345678', password: 'correct-password' })
      .expect(200);
    expect(user.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(user.refreshToken).not.toBe(login.body.refresh_token);
    const profile = await request(server)
      .get('/users/getCurrentUser')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);
    expect(profile.body).toEqual({
      guid: user.guid,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    const rotated = await request(server)
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${login.body.refresh_token}`)
      .expect(200);
    expect(rotated.body.refresh_token).not.toBe(login.body.refresh_token);
    await request(server)
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${login.body.refresh_token}`)
      .expect(401);
    await request(server)
      .get('/auth/refresh')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    await request(server)
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${rotated.body.refresh_token}`)
      .expect(200);
  });

  it('authenticates household list and creation after login', async () => {
    const server = app.getHttpServer();
    const login = await request(server)
      .post('/auth/login')
      .send({ phone: '12345678', password: 'correct-password' })
      .expect(200);
    const authorization = `Bearer ${login.body.access_token}`;
    const list = await request(server)
      .get('/households')
      .set('Authorization', authorization)
      .expect(200);
    expect(list.body.authenticatedUserId).toBe(user.id);
    const created = await request(server)
      .post('/households')
      .set('Authorization', authorization)
      .send({ displayName: 'Home' })
      .expect(201);
    expect(created.body.authenticatedUserId).toBe(user.id);
    await request(server).get('/households').expect(401);
    await request(server)
      .get('/households')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    await request(server)
      .get('/households')
      .set('Authorization', `Bearer ${login.body.refresh_token}`)
      .expect(401);
  });
});

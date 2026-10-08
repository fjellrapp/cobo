import { expect } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../constants/index.js';
import { RefreshTokenRepositoy } from './refreshToken.repository.js';

describe('RefreshTokenRepository', () => {
  it('issues distinct signed tokens even within the same second', async () => {
    const original = jwtConstants.refresh_secret;
    jwtConstants.refresh_secret = 'test-only-secret-not-used-in-production';
    try {
      const jwt = new JwtService();
      const repository = new RefreshTokenRepositoy(jwt);
      const first = await repository.createRefreshToken({
        guid: 'guid',
      } as never);
      const second = await repository.createRefreshToken({
        guid: 'guid',
      } as never);
      expect(first).not.toBe(second);
      expect(
        jwt.verify(first, { secret: jwtConstants.refresh_secret }).userGuid,
      ).toBe('guid');
    } finally {
      jwtConstants.refresh_secret = original;
    }
  });
});

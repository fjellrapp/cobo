import { expect, jest } from '@jest/globals';
import { AccessTokenRepository } from './accessToken.repository.js';

describe('AccessTokenRepository', () => {
  it('signs a subject id and never includes the password', async () => {
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    const repository = new AccessTokenRepository(jwtService as any);

    await repository.generateAccessToken({
      id: 42,
      guid: 'user-guid',
      phone: '123',
      password: 'must-not-be-in-token',
    } as any);

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: '42', guid: 'user-guid', phone: '123' },
      expect.objectContaining({ secret: expect.any(String) }),
    );
  });
});

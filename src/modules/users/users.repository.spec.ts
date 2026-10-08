import { expect, jest } from '@jest/globals';
import { UsersRepository } from './users.repository.js';

describe('UsersRepository refresh persistence', () => {
  it('updates only the refresh token field', async () => {
    const prisma = { user: { update: jest.fn().mockResolvedValue({}) } };
    const repository = new UsersRepository(prisma as never, {} as never);
    await repository.setRefreshToken('guid', 'digest');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { guid: 'guid' },
      data: { refreshToken: 'digest' },
    });
  });

  it('uses the previous digest as an atomic update condition', async () => {
    const prisma = {
      user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const repository = new UsersRepository(prisma as never, {} as never);
    await expect(
      repository.rotateRefreshToken('guid', 'old', 'new'),
    ).resolves.toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { guid: 'guid', refreshToken: 'old' },
      data: { refreshToken: 'new' },
    });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      repository.rotateRefreshToken('guid', 'old', 'new'),
    ).resolves.toBe(false);
  });
});

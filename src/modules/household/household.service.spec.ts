import { expect, jest } from '@jest/globals';
import { HouseholdDomainError } from './household-domain.error.js';
import { HouseholdService } from './household.service.js';

describe('HouseholdService', () => {
  it('trims display names and creates an owner membership atomically', async () => {
    const transaction = {
      household: {
        create: jest.fn().mockResolvedValue({
          id: 15,
          publicId: '7c317d6e-a842-4828-b7c8-5f86482f4aa9',
          displayName: 'Shared home',
          createdAt: new Date('2026-10-06T12:00:00Z'),
        }),
      },
      householdMembership: {
        create: jest.fn().mockResolvedValue({
          role: 'OWNER',
          joinedAt: new Date('2026-10-06T12:00:00Z'),
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const access = {};
    const service = new HouseholdService(prisma as never, access as never);

    const result = await service.create(7, '  Shared home  ');

    expect(transaction.household.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { displayName: 'Shared home' } }),
    );
    expect(transaction.householdMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 7, householdId: 15, role: 'OWNER' },
      }),
    );
    expect(result.id).toBe('7c317d6e-a842-4828-b7c8-5f86482f4aa9');
  });

  it('rejects a blank display name before creating a household', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new HouseholdService(prisma as never, {} as never);

    await expect(service.create(7, '   ')).rejects.toBeInstanceOf(
      HouseholdDomainError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists only active memberships and uses public household identifiers', async () => {
    const prisma = {
      householdMembership: {
        findMany: jest.fn().mockResolvedValue([
          {
            role: 'OWNER',
            household: {
              publicId: '7c317d6e-a842-4828-b7c8-5f86482f4aa9',
              displayName: 'Shared home',
              _count: { memberships: 2 },
            },
          },
        ]),
      },
    };
    const service = new HouseholdService(prisma as never, {} as never);

    await expect(service.listMine(7)).resolves.toEqual({
      items: [
        {
          id: '7c317d6e-a842-4828-b7c8-5f86482f4aa9',
          displayName: 'Shared home',
          role: 'OWNER',
          memberCount: 2,
        },
      ],
    });
    expect(prisma.householdMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7, leftAt: null } }),
    );
  });
});

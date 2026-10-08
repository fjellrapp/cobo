import { jest } from '@jest/globals';
import { HouseholdMembershipService } from './household-membership.service.js';
import { HouseholdDomainError } from './household-domain.error.js';
import { HouseholdAccessService } from './household-access.service.js';

describe('HouseholdAccessService', () => {
  it('rejects access when no current membership exists', async () => {
    const prisma = {
      householdMembership: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const access = new HouseholdAccessService(prisma as never);

    await expect(
      access.requireMembership(7, 'household-public-id'),
    ).rejects.toMatchObject({
      code: 'HOUSEHOLD_NOT_FOUND',
    });
  });

  it('rejects owner operations for a current member role', async () => {
    const prisma = {
      householdMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ role: 'MEMBER', leftAt: null }),
      },
    };
    const access = new HouseholdAccessService(prisma as never);

    await expect(
      access.requireOwner(7, 'household-public-id'),
    ).rejects.toMatchObject({
      code: 'HOUSEHOLD_OWNER_REQUIRED',
    });
  });
});

describe('HouseholdMembershipService.canDeleteMembership', () => {
  it('allows removing an owner when another owner remains', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'OWNER',
        targetRole: 'OWNER',
        ownerCount: 2,
        isSelf: false,
      }),
    ).toEqual({ allowed: true });
  });

  it('rejects removing the only owner', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'OWNER',
        targetRole: 'OWNER',
        ownerCount: 1,
        isSelf: false,
      }),
    ).toEqual({ allowed: false, code: 'LAST_OWNER_REQUIRED' });
  });

  it('rejects the last owner leaving a one-owner household', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'OWNER',
        targetRole: 'OWNER',
        ownerCount: 1,
        isSelf: true,
      }),
    ).toEqual({ allowed: false, code: 'LAST_OWNER_REQUIRED' });
  });

  it('allows members to delete only their own membership', () => {
    expect(
      HouseholdMembershipService.canDeleteMembership({
        actorRole: 'MEMBER',
        targetRole: 'MEMBER',
        ownerCount: 1,
        isSelf: false,
      }),
    ).toEqual({ allowed: false, code: 'MEMBERSHIP_SELF_DELETE_ONLY' });
  });
});

describe('HouseholdMembershipService.canChangeRole', () => {
  it('rejects demoting the only owner', () => {
    expect(
      HouseholdMembershipService.canChangeRole({
        targetRole: 'OWNER',
        nextRole: 'MEMBER',
        ownerCount: 1,
      }),
    ).toEqual({ allowed: false, code: 'LAST_OWNER_REQUIRED' });
  });

  it('allows demoting an owner when another owner remains', () => {
    expect(
      HouseholdMembershipService.canChangeRole({
        targetRole: 'OWNER',
        nextRole: 'MEMBER',
        ownerCount: 2,
      }),
    ).toEqual({ allowed: true });
  });
});

describe('HouseholdDomainError', () => {
  it('retains a stable error code and safe message', () => {
    const error = new HouseholdDomainError(
      'HOUSEHOLD_OWNER_REQUIRED',
      'An owner is required.',
    );

    expect(error).toMatchObject({
      name: 'HouseholdDomainError',
      code: 'HOUSEHOLD_OWNER_REQUIRED',
      message: 'An owner is required.',
    });
  });
});

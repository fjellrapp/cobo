import { expect } from '@jest/globals';
import { jest } from '@jest/globals';
import { HouseholdInvitationService } from './household-invitations.service.js';
import {
  buildInvitationUrl,
  getInvitationStatus,
  hashInvitationToken,
} from './household-invitations.service.js';

describe('household invitation helpers', () => {
  it('hashes the raw bearer token before persistence', () => {
    expect(hashInvitationToken('secret-token')).toBe(
      '930bbdc51b6aed5c2a5678fd6e28dee7a05e8a4b643cfc0b4427c3efb86c0d94',
    );
  });

  it('builds a client invitation link without putting the token in its path', () => {
    expect(buildInvitationUrl('https://client.example/', 'opaque-token')).toBe(
      'https://client.example/invite#token=opaque-token',
    );
  });

  it('rejects a non-HTTP client URL scheme', () => {
    expect(() =>
      buildInvitationUrl('javascript:alert(1)', 'opaque-token'),
    ).toThrow(expect.objectContaining({ code: 'CLIENT_APP_URL_INVALID' }));
  });

  it('derives invitation status in revoked, accepted, expired precedence', () => {
    const now = new Date('2026-10-06T00:00:00.000Z');
    const expired = new Date('2026-10-05T00:00:00.000Z');

    expect(
      getInvitationStatus(
        { revokedAt: now, acceptedAt: now, expiresAt: expired },
        now,
      ),
    ).toBe('REVOKED');
    expect(
      getInvitationStatus(
        { revokedAt: null, acceptedAt: now, expiresAt: expired },
        now,
      ),
    ).toBe('ACCEPTED');
    expect(
      getInvitationStatus(
        { revokedAt: null, acceptedAt: null, expiresAt: expired },
        now,
      ),
    ).toBe('EXPIRED');
    expect(
      getInvitationStatus(
        {
          revokedAt: null,
          acceptedAt: null,
          expiresAt: new Date('2026-10-07T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe('PENDING');
  });

  it('returns an existing membership when the same account retries acceptance', async () => {
    const tx = {
      householdInvitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          householdId: 3,
          tokenHash: hashInvitationToken('a'.repeat(32)),
          expiresAt: new Date('2026-10-07T00:00:00.000Z'),
          acceptedAt: new Date('2026-10-06T12:00:00.000Z'),
          acceptedByUserId: 12,
          revokedAt: null,
          household: {
            id: 3,
            publicId: '7c317d6e-a842-4828-b7c8-5f86482f4aa9',
            displayName: 'Home',
          },
        }),
      },
      householdMembership: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          publicId: '8c317d6e-a842-4828-b7c8-5f86482f4aa9',
          role: 'MEMBER',
          joinedAt: new Date('2026-10-06T12:00:00.000Z'),
          leftAt: null,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      householdInvitationUpdate: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn((operation) => operation(tx)),
    };
    const service = new HouseholdInvitationService(
      prisma as never,
      {} as never,
    );

    const result = await service.accept(12, 'a'.repeat(32));

    expect(result.membership.id).toBe('8c317d6e-a842-4828-b7c8-5f86482f4aa9');
    expect(tx.householdMembership.create).not.toHaveBeenCalled();
    expect(tx.householdMembership.update).not.toHaveBeenCalled();
  });

  it('lists pending invitation metadata without token material', async () => {
    const prisma = {
      householdInvitation: {
        findMany: jest.fn().mockResolvedValue([
          {
            publicId: 'inv-public-id',
            createdAt: new Date('2026-10-06T00:00:00.000Z'),
            expiresAt: new Date('2026-10-13T00:00:00.000Z'),
            acceptedAt: null,
            revokedAt: null,
            tokenHash: 'must-not-escape',
          },
        ]),
      },
    };
    const access = {
      requireOwner: jest.fn().mockResolvedValue({ householdId: 3 }),
    };
    const service = new HouseholdInvitationService(
      prisma as never,
      access as never,
    );

    const result = await service.listPending(7, 'household-public-id');

    expect(result.items[0]).not.toHaveProperty('tokenHash');
    expect(result.items[0]).not.toHaveProperty('inviteUrl');
    expect(result.items[0].status).toBe('PENDING');
  });
});

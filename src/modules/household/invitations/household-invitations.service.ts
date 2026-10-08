import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { HouseholdDomainError } from '../household-domain.error.js';
import { HouseholdAccessService } from '../household-access.service.js';
import { PrismaService } from '../../../common/providers/prisma.service.js';
import { HouseholdMembershipService } from '../household-membership.service.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getInvitationStatus(
  invitation: {
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  },
  now = new Date(),
): InvitationStatus {
  if (invitation.revokedAt) return 'REVOKED';
  if (invitation.acceptedAt) return 'ACCEPTED';
  if (now >= invitation.expiresAt) return 'EXPIRED';
  return 'PENDING';
}

export function buildInvitationUrl(baseUrl: string, token: string): string {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new HouseholdDomainError(
      baseUrl ? 'CLIENT_APP_URL_INVALID' : 'CLIENT_APP_URL_MISSING',
      'Invitation links are not configured.',
    );
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new HouseholdDomainError(
      'CLIENT_APP_URL_INVALID',
      'Invitation links are not configured.',
    );
  }
  const url = new URL('/invite', base);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

@Injectable()
export class HouseholdInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HouseholdAccessService,
  ) {}

  async create(userId: number, householdPublicId: string) {
    const membership = await this.access.requireOwner(
      userId,
      householdPublicId,
    );
    const clientAppUrl = this.getClientAppUrl();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation = await this.prisma.householdInvitation.create({
      data: {
        householdId: membership.householdId,
        createdByUserId: userId,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      },
      select: {
        publicId: true,
        householdId: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      id: invitation.publicId,
      householdId: householdPublicId,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      status: 'pending' as const,
      inviteUrl: buildInvitationUrl(clientAppUrl, token),
    };
  }

  async listPending(userId: number, householdPublicId: string) {
    const owner = await this.access.requireOwner(userId, householdPublicId);
    const rows = await this.prisma.householdInvitation.findMany({
      where: {
        householdId: owner.householdId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        publicId: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });

    return {
      items: rows
        .map(({ publicId, createdAt, expiresAt, acceptedAt, revokedAt }) => ({
          id: publicId,
          createdAt,
          expiresAt,
          status: getInvitationStatus({
            acceptedAt,
            revokedAt,
            expiresAt,
          }),
        }))
        .filter((row) => row.status === 'PENDING'),
    };
  }

  async revoke(
    userId: number,
    householdPublicId: string,
    invitationPublicId: string,
  ): Promise<void> {
    const owner = await this.access.requireOwner(userId, householdPublicId);
    const invitation = await this.prisma.householdInvitation.findFirst({
      where: { publicId: invitationPublicId, householdId: owner.householdId },
    });
    if (!invitation) {
      throw new HouseholdDomainError(
        'INVITATION_NOT_FOUND',
        'Invitation was not found.',
      );
    }
    if (invitation.acceptedAt) {
      throw new HouseholdDomainError(
        'INVITATION_ALREADY_USED',
        'An accepted invitation cannot be revoked.',
      );
    }
    if (invitation.revokedAt) return;

    await this.prisma.householdInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });
  }

  async preview(token: string) {
    const invitation = await this.findInvitationByToken(token);
    this.assertPending(invitation);

    return {
      household: {
        id: invitation.household.publicId,
        displayName: invitation.household.displayName,
      },
      expiresAt: invitation.expiresAt,
      status: 'pending' as const,
    };
  }

  async accept(userId: number, token: string) {
    const tokenHash = hashInvitationToken(token);
    return HouseholdMembershipService.runSerializable(async (tx) => {
      const invitation = await tx.householdInvitation.findUnique({
        where: { tokenHash },
        include: {
          household: {
            select: { id: true, publicId: true, displayName: true },
          },
        },
      });
      if (!invitation) {
        throw new HouseholdDomainError(
          'INVITATION_NOT_FOUND',
          'Invitation was not found.',
        );
      }
      const existing = await tx.householdMembership.findUnique({
        where: {
          userId_householdId: {
            userId,
            householdId: invitation.householdId,
          },
        },
      });

      if (invitation.acceptedAt) {
        if (
          invitation.acceptedByUserId === userId &&
          existing?.leftAt === null
        ) {
          return {
            household: {
              id: invitation.household.publicId,
              displayName: invitation.household.displayName,
            },
            membership: {
              id: existing.publicId,
              role: existing.role.toLowerCase(),
              joinedAt: existing.joinedAt,
            },
          };
        }
        throw new HouseholdDomainError(
          'INVITATION_ALREADY_USED',
          'Invitation has already been used.',
        );
      }
      this.assertPending(invitation);

      if (existing && existing.leftAt === null) {
        await tx.householdInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date(), acceptedByUserId: userId },
        });
        return {
          household: {
            id: invitation.household.publicId,
            displayName: invitation.household.displayName,
          },
          membership: {
            id: existing.publicId,
            role: existing.role.toLowerCase(),
            joinedAt: existing.joinedAt,
          },
        };
      }

      const membership = existing
        ? await tx.householdMembership.update({
            where: { id: existing.id },
            data: { role: 'MEMBER', joinedAt: new Date(), leftAt: null },
          })
        : await tx.householdMembership.create({
            data: {
              userId,
              householdId: invitation.householdId,
              role: 'MEMBER',
            },
          });

      await tx.householdInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedByUserId: userId },
      });

      return {
        household: {
          id: invitation.household.publicId,
          displayName: invitation.household.displayName,
        },
        membership: {
          id: membership.publicId,
          role: membership.role.toLowerCase(),
          joinedAt: membership.joinedAt,
        },
      };
    }, this.prisma);
  }

  private async findInvitationByToken(token: string) {
    const invitation = await this.prisma.householdInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      include: { household: { select: { publicId: true, displayName: true } } },
    });
    if (!invitation) {
      throw new HouseholdDomainError(
        'INVITATION_NOT_FOUND',
        'Invitation was not found.',
      );
    }
    return invitation;
  }

  private assertPending(invitation: {
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  }) {
    const status = getInvitationStatus(invitation);
    if (status === 'EXPIRED') {
      throw new HouseholdDomainError(
        'INVITATION_EXPIRED',
        'Invitation has expired.',
      );
    }
    if (status === 'REVOKED') {
      throw new HouseholdDomainError(
        'INVITATION_REVOKED',
        'Invitation was revoked.',
      );
    }
    if (status === 'ACCEPTED') {
      throw new HouseholdDomainError(
        'INVITATION_ALREADY_USED',
        'Invitation has already been used.',
      );
    }
  }

  private getClientAppUrl(): string {
    const value = process.env.CLIENT_APP_URL;
    if (!value) {
      throw new HouseholdDomainError(
        'CLIENT_APP_URL_MISSING',
        'Invitation links are not configured.',
      );
    }
    return value;
  }
}

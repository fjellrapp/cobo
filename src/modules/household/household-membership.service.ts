import { Injectable } from '@nestjs/common';
import type { HouseholdMembership as HouseholdMembershipModel } from '../../generated/prisma/client.js';
import { PrismaService } from '../../common/providers/prisma.service.js';
import { HouseholdDomainError } from './household-domain.error.js';
import { HouseholdAccessService } from './household-access.service.js';
import { Prisma } from '../../generated/prisma/client.js';

export type HouseholdRole = 'OWNER' | 'MEMBER';

type DeleteMembershipInput = {
  actorRole: HouseholdRole;
  targetRole: HouseholdRole;
  ownerCount: number;
  isSelf: boolean;
};

export type MembershipDeletionPolicy =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | 'LAST_OWNER_REQUIRED'
        | 'MEMBERSHIP_SELF_DELETE_ONLY'
        | 'HOUSEHOLD_OWNER_REQUIRED';
    };

@Injectable()
export class HouseholdMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HouseholdAccessService,
  ) {}

  static canChangeRole(input: {
    targetRole: HouseholdRole;
    nextRole: HouseholdRole;
    ownerCount: number;
  }): MembershipDeletionPolicy {
    if (
      input.targetRole === 'OWNER' &&
      input.nextRole !== 'OWNER' &&
      input.ownerCount <= 1
    ) {
      return { allowed: false, code: 'LAST_OWNER_REQUIRED' };
    }

    return { allowed: true };
  }

  static canDeleteMembership(
    input: DeleteMembershipInput,
  ): MembershipDeletionPolicy {
    if (input.actorRole !== 'OWNER' && !input.isSelf) {
      return { allowed: false, code: 'MEMBERSHIP_SELF_DELETE_ONLY' };
    }

    if (input.targetRole === 'OWNER' && input.ownerCount <= 1) {
      return { allowed: false, code: 'LAST_OWNER_REQUIRED' };
    }

    return { allowed: true };
  }

  static async runSerializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    prisma: PrismaService,
  ): Promise<T> {
    // Retry PostgreSQL serialization conflicts; policy checks are rerun in the new snapshot.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!retryable || attempt === 2) {
          if (retryable) {
            throw new HouseholdDomainError(
              'LAST_OWNER_REQUIRED',
              'Household membership changed concurrently. Refresh and retry.',
            );
          }
          throw error;
        }
      }
    }
    throw new HouseholdDomainError(
      'CONFIGURATION_ERROR',
      'Could not complete the household membership operation.',
    );
  }

  async listMembers(userId: number, householdPublicId: string) {
    const membership = await this.access.requireMembership(
      userId,
      householdPublicId,
    );
    const rows = await this.prisma.householdMembership.findMany({
      where: { householdId: membership.householdId, leftAt: null },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      select: {
        publicId: true,
        role: true,
        joinedAt: true,
        user: { select: { guid: true, firstName: true, lastName: true } },
      },
    });

    return rows.map(({ publicId, role, joinedAt, user }) => ({
      id: publicId,
      user: {
        id: user.guid,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
      },
      role,
      joinedAt,
    }));
  }

  async getMembershipByPublicId(
    householdId: number,
    membershipPublicId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<HouseholdMembershipModel> {
    const membership = await client.householdMembership.findFirst({
      where: {
        publicId: membershipPublicId,
        householdId,
        leftAt: null,
      },
    });
    if (!membership) {
      throw new HouseholdDomainError(
        'MEMBER_NOT_ACTIVE',
        'Household member was not found.',
      );
    }
    return membership;
  }

  async changeRole(
    actorUserId: number,
    householdPublicId: string,
    membershipPublicId: string,
    nextRole: HouseholdRole,
  ) {
    return HouseholdMembershipService.runSerializable(async (tx) => {
      const { householdId } = await this.access.requireOwner(
        actorUserId,
        householdPublicId,
        tx,
      );
      const target = await this.getMembershipByPublicId(
        householdId,
        membershipPublicId,
        tx,
      );

      const ownerCount = await this.access.countOwners(target.householdId, tx);
      const policy = HouseholdMembershipService.canChangeRole({
        targetRole: target.role,
        nextRole,
        ownerCount,
      });
      if (policy.allowed === false) {
        throw new HouseholdDomainError(
          policy.code,
          policy.code === 'LAST_OWNER_REQUIRED'
            ? 'The household must retain at least one owner.'
            : 'Only a household owner can change membership roles.',
        );
      }

      return tx.householdMembership.update({
        where: { id: target.id },
        data: { role: nextRole },
        select: {
          publicId: true,
          role: true,
          joinedAt: true,
          user: { select: { guid: true, firstName: true, lastName: true } },
        },
      });
    }, this.prisma);
  }

  async deleteMembership(
    actorUserId: number,
    householdPublicId: string,
    membershipPublicId: string,
  ): Promise<void> {
    return HouseholdMembershipService.runSerializable(async (tx) => {
      const actorMembership = await this.access.requireMembership(
        actorUserId,
        householdPublicId,
        tx,
      );
      const target = await this.getMembershipByPublicId(
        actorMembership.householdId,
        membershipPublicId,
        tx,
      );

      const policy = HouseholdMembershipService.canDeleteMembership({
        actorRole: actorMembership.role,
        targetRole: target.role,
        ownerCount: await this.access.countOwners(target.householdId, tx),
        isSelf: target.userId === actorUserId,
      });
      if (policy.allowed === false) {
        throw new HouseholdDomainError(
          policy.code,
          policy.code === 'LAST_OWNER_REQUIRED'
            ? 'The household must retain at least one owner.'
            : 'Only an owner can remove another member.',
        );
      }

      await tx.householdMembership.update({
        where: { id: target.id },
        data: { leftAt: new Date() },
      });
    }, this.prisma);
  }
}

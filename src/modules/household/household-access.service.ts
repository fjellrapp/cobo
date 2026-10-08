import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service.js';
import { HouseholdDomainError } from './household-domain.error.js';
import type { Prisma } from '../../generated/prisma/client.js';

type PrismaReader = PrismaService | Prisma.TransactionClient;

@Injectable()
export class HouseholdAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(
    userId: number,
    householdPublicId: string,
    client: PrismaReader = this.prisma,
  ) {
    const membership = await client.householdMembership.findFirst({
      where: {
        userId,
        leftAt: null,
        household: { publicId: householdPublicId },
      },
      include: { household: true },
    });

    if (!membership) {
      throw new HouseholdDomainError(
        'HOUSEHOLD_NOT_FOUND',
        'Household was not found.',
      );
    }

    return membership;
  }

  async requireOwner(
    userId: number,
    householdPublicId: string,
    client: PrismaReader = this.prisma,
  ) {
    const membership = await this.requireMembership(
      userId,
      householdPublicId,
      client,
    );

    if (membership.role !== 'OWNER') {
      throw new HouseholdDomainError(
        'HOUSEHOLD_OWNER_REQUIRED',
        'Only a household owner can perform this action.',
      );
    }

    return membership;
  }

  async countOwners(
    householdId: number,
    client: PrismaReader = this.prisma,
  ): Promise<number> {
    return client.householdMembership.count({
      where: { householdId, role: 'OWNER', leftAt: null },
    });
  }
}

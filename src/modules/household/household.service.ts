import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service.js';
import { HouseholdDomainError } from './household-domain.error.js';
import { HouseholdAccessService } from './household-access.service.js';

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HouseholdAccessService,
  ) {}

  async create(userId: number, displayName: string) {
    const name = displayName.trim();
    if (!name || name.length > 120) {
      throw new HouseholdDomainError(
        'VALIDATION_ERROR',
        'Household name is required.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { displayName: name },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          createdAt: true,
        },
      });
      const membership = await tx.householdMembership.create({
        data: {
          userId,
          householdId: household.id,
          role: 'OWNER',
        },
        select: { role: true, joinedAt: true },
      });

      return {
        id: household.publicId,
        displayName: household.displayName,
        createdAt: household.createdAt,
        membership,
      };
    });
  }

  async listMine(userId: number) {
    const memberships = await this.prisma.householdMembership.findMany({
      where: { userId, leftAt: null },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      select: {
        role: true,
        household: {
          select: {
            publicId: true,
            displayName: true,
            _count: { select: { memberships: { where: { leftAt: null } } } },
          },
        },
      },
    });

    return {
      items: memberships.map(({ role, household }) => ({
        id: household.publicId,
        displayName: household.displayName,
        role,
        memberCount: household._count.memberships,
      })),
    };
  }

  async getOne(userId: number, householdPublicId: string) {
    await this.access.requireMembership(userId, householdPublicId);
    const household = await this.prisma.household.findUnique({
      where: { publicId: householdPublicId },
      select: {
        publicId: true,
        displayName: true,
        description: true,
        createdAt: true,
      },
    });
    if (!household) {
      throw new HouseholdDomainError(
        'HOUSEHOLD_NOT_FOUND',
        'Household was not found.',
      );
    }
    return {
      id: household.publicId,
      displayName: household.displayName,
      description: household.description,
      createdAt: household.createdAt,
    };
  }
}

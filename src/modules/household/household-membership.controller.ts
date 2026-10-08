import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUserId } from '../../common/utils/decorators/current-user-id.js';
import { UpdateMembershipRoleDto } from './dto/update-membership-role.dto.js';
import { HouseholdMembershipService } from './household-membership.service.js';

@Controller('households/:householdId/members')
export class HouseholdMembershipController {
  constructor(private readonly memberships: HouseholdMembershipService) {}

  @Get()
  list(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.memberships.listMembers(userId, householdId);
  }

  @Patch(':membershipId')
  updateRole(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('membershipId', new ParseUUIDPipe()) membershipId: string,
    @Body() body: UpdateMembershipRoleDto,
  ) {
    return this.memberships.changeRole(
      userId,
      householdId,
      membershipId,
      body.role.toUpperCase() as 'OWNER' | 'MEMBER',
    );
  }

  @Delete(':membershipId')
  async delete(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('membershipId', new ParseUUIDPipe()) membershipId: string,
  ) {
    await this.memberships.deleteMembership(userId, householdId, membershipId);
  }
}

import { Module } from '@nestjs/common';
import { HouseholdService } from './household.service.js';
import { HouseholdController } from './household.controller.js';
import { HouseholdMembershipController } from './household-membership.controller.js';
import { HouseholdMembershipService } from './household-membership.service.js';
import { HouseholdAccessService } from './household-access.service.js';
import { HouseholdInvitationsController } from './invitations/household-invitations.controller.js';
import { HouseholdInvitationService } from './invitations/household-invitations.service.js';
import { HouseholdExceptionFilter } from './household-exception.filter.js';
import { APP_FILTER } from '@nestjs/core';

@Module({
  controllers: [
    HouseholdController,
    HouseholdMembershipController,
    HouseholdInvitationsController,
  ],
  providers: [
    HouseholdService,
    HouseholdMembershipService,
    HouseholdAccessService,
    HouseholdInvitationService,
    { provide: APP_FILTER, useClass: HouseholdExceptionFilter },
  ],
  exports: [
    HouseholdService,
    HouseholdMembershipService,
    HouseholdAccessService,
  ],
})
export class HouseholdModule {}

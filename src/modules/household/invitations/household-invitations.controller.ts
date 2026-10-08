import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUserId } from '../../../common/utils/decorators/current-user-id.js';
import { Public } from '../../../common/utils/decorators/public.js';
import { InvitationTokenDto } from './dto/invitation-token.dto.js';
import { HouseholdInvitationService } from './household-invitations.service.js';

@Controller()
export class HouseholdInvitationsController {
  constructor(private readonly invitations: HouseholdInvitationService) {}

  @Get('households/:householdId/invitations')
  listPending(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.invitations.listPending(userId, householdId);
  }

  @Post('households/:householdId/invitations')
  create(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.invitations.create(userId, householdId);
  }

  @Delete('households/:householdId/invitations/:invitationId')
  revoke(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.invitations.revoke(userId, householdId, invitationId);
  }

  @Public()
  @Post('invitation-previews')
  preview(@Body() body: InvitationTokenDto) {
    return this.invitations.preview(body.token);
  }

  @Post('household-memberships')
  accept(@CurrentUserId() userId: number, @Body() body: InvitationTokenDto) {
    return this.invitations.accept(userId, body.token);
  }
}

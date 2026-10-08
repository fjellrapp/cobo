import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../common/utils/decorators/current-user-id.js';
import { CreateHouseholdDto } from './dto/create-household.dto.js';
import { HouseholdService } from './household.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('households')
@UseGuards(JwtAuthGuard)
export class HouseholdController {
  constructor(private readonly service: HouseholdService) {}

  @Post()
  create(@CurrentUserId() userId: number, @Body() body: CreateHouseholdDto) {
    return this.service.create(userId, body.displayName);
  }

  @Get()
  listMine(@CurrentUserId() userId: number) {
    return this.service.listMine(userId);
  }

  @Get(':householdId')
  getOne(
    @CurrentUserId() userId: number,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.service.getOne(userId, householdId);
  }
}

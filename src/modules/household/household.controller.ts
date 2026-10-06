import { Body, Controller, Post } from '@nestjs/common';
import type { Household } from '../../generated/prisma/client.js';
import { HouseholdService } from './household.service.js';

@Controller('household')
export class HouseholdController {
  constructor(private service: HouseholdService) {}

  @Post('create')
  async create(@Body() household: Household) {
    return household;
  }
}

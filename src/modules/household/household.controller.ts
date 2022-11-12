import { Body, Controller, Post } from '@nestjs/common';
import { Household } from '@prisma/client';
import { HouseholdService } from './household.service';

@Controller('household')
export class HouseholdController {
  constructor(private service: HouseholdService) {}

  @Post('create')
  async create(@Body() household: Household) {
    return household;
  }
}

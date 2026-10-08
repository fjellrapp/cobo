import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  displayName!: string;
}

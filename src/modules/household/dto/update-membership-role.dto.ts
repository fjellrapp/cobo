import { IsIn } from 'class-validator';

export class UpdateMembershipRoleDto {
  @IsIn(['owner', 'member'])
  role!: 'owner' | 'member';
}

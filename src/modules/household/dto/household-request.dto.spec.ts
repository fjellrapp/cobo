import { validate } from 'class-validator';
import { UpdateMembershipRoleDto } from './update-membership-role.dto.js';
import { InvitationTokenDto } from '../invitations/dto/invitation-token.dto.js';

describe('household request DTOs', () => {
  it('accepts only supported membership roles', async () => {
    for (const role of ['owner', 'member']) {
      await expect(
        validate(Object.assign(new UpdateMembershipRoleDto(), { role })),
      ).resolves.toHaveLength(0);
    }
    await expect(
      validate(Object.assign(new UpdateMembershipRoleDto(), { role: 'admin' })),
    ).resolves.not.toHaveLength(0);
  });

  it('requires a bounded string invitation token', async () => {
    await expect(
      validate(
        Object.assign(new InvitationTokenDto(), { token: 'x'.repeat(32) }),
      ),
    ).resolves.toHaveLength(0);
    await expect(
      validate(Object.assign(new InvitationTokenDto(), { token: 'short' })),
    ).resolves.not.toHaveLength(0);
  });
});

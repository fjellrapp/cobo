import { expect, jest } from '@jest/globals';
import { HouseholdMembershipController } from './household-membership.controller.js';

describe('HouseholdMembershipController', () => {
  it('returns current household member summaries from the service', async () => {
    const members = [{ id: 'membership-public-id', role: 'owner' }];
    const service = { listMembers: jest.fn().mockResolvedValue(members) };
    const controller = new HouseholdMembershipController(service as never);

    await expect(controller.list(12, 'household-public-id')).resolves.toEqual(
      members,
    );
    expect(service.listMembers).toHaveBeenCalledWith(12, 'household-public-id');
  });

  it('maps the client role to the domain enum before delegating', async () => {
    const service = {
      changeRole: jest.fn().mockResolvedValue({ role: 'OWNER' }),
    };
    const controller = new HouseholdMembershipController(service as never);

    await controller.updateRole(
      12,
      'household-public-id',
      'membership-public-id',
      {
        role: 'owner',
      },
    );
    expect(service.changeRole).toHaveBeenCalledWith(
      12,
      'household-public-id',
      'membership-public-id',
      'OWNER',
    );
  });
});

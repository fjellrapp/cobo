import { expect, jest } from '@jest/globals';
import { HouseholdInvitationsController } from './household-invitations.controller.js';

describe('HouseholdInvitationsController', () => {
  it('delegates invite preview with the request-body token', async () => {
    const service = {
      preview: jest.fn().mockResolvedValue({ status: 'pending' }),
    };
    const controller = new HouseholdInvitationsController(service as never);

    await expect(
      controller.preview({ token: 'x'.repeat(32) }),
    ).resolves.toEqual({
      status: 'pending',
    });
    expect(service.preview).toHaveBeenCalledWith('x'.repeat(32));
  });

  it('delegates acceptance with the authenticated user and token', async () => {
    const service = { accept: jest.fn().mockResolvedValue({ membership: {} }) };
    const controller = new HouseholdInvitationsController(service as never);

    await controller.accept(9, { token: 'x'.repeat(32) });
    expect(service.accept).toHaveBeenCalledWith(9, 'x'.repeat(32));
  });
});

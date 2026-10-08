import { expect, jest } from '@jest/globals';
import { UsersController } from './users.controller.js';

describe('UsersController safe profiles', () => {
  it.each(['current', 'phone'])(
    'does not expose credentials through %s lookup',
    async (lookup) => {
      const user = {
        id: 1,
        guid: 'guid',
        email: 'a@example.test',
        phone: '123',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'hash',
        refreshToken: 'secret',
        session: 'secret',
      };
      const users = {
        getById: jest.fn().mockResolvedValue(user),
        getByPhone: jest.fn().mockResolvedValue(user),
      };
      const auth = { getGuid: jest.fn().mockResolvedValue('guid') };
      const response = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const controller = new UsersController(users as never, auth as never);
      const request = {
        headers: { authorization: 'Bearer token' },
        params: { phone: '123' },
      };
      if (lookup === 'current')
        await controller.getCurrentUser(request as never, response as never);
      else await controller.getByPhone(request as never, response as never);
      expect(response.send).toHaveBeenCalledWith({
        guid: 'guid',
        email: 'a@example.test',
        phone: '123',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    },
  );
});

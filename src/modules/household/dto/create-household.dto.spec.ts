import { validate } from 'class-validator';
import { CreateHouseholdDto } from './create-household.dto.js';

describe('CreateHouseholdDto', () => {
  it('accepts a non-empty display name within the maximum length', async () => {
    const dto = Object.assign(new CreateHouseholdDto(), {
      displayName: 'Our home',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a blank name, non-string value, and an overlong name', async () => {
    for (const displayName of ['', '   ', 42, 'x'.repeat(121)]) {
      const dto = Object.assign(new CreateHouseholdDto(), { displayName });
      await expect(validate(dto)).resolves.not.toHaveLength(0);
    }
  });
});

import 'dotenv/config';

export const jwtConstants = {
  access_secret: process.env.JWT_KEY,
  refresh_secret: process.env.JWT_KEY_REFRESH,
};

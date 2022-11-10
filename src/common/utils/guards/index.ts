import { User } from '@prisma/client';

export function isUser(user: User | any): user is User {
  console.log('check is user', user);
  return (user as User).phone !== undefined;
}

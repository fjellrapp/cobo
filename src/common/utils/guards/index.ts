import { User } from '@prisma/client';

export function isUser(user: User | any): user is User {
  return (user as User).phone !== undefined;
}

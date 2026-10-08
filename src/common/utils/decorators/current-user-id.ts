import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<{
      user?: { userId?: number };
    }>();
    const userId = request.user?.userId;
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException();
    }
    return userId as number;
  },
);

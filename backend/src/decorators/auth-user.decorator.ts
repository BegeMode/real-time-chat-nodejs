import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { UserDocument } from '@users/models/user.js';

interface IRequestWithUser {
  user: UserDocument;
}

export const AuthUser = createParamDecorator(
  // eslint-disable-next-line sonarjs/function-return-type -- Decorator intentionally returns different types
  (data: keyof UserDocument | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const { user } = request;

    return data ? user[data] : user;
  },
);

import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { UserDocument } from '@users/models/user.js';

interface IRequestWithUser {
  user?: UserDocument;
}

export const AuthUser = createParamDecorator(
  // eslint-disable-next-line sonarjs/function-return-type -- Decorator intentionally returns different types
  (data: keyof UserDocument | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const { user } = request;

    if (!user) return null;

    const value = data ? user[data] : user;

    // If we're requesting a specific field (like _id) and it's an object (ObjectId),
    // convert it to a string automatically
    if (data && value && typeof value === 'object' && 'toString' in value) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return value.toString();
    }

    return value;
  },
);

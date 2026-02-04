import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract AbortSignal from the request
 */
export const AbortSignal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AbortSignal => {
    const request = ctx.switchToHttp().getRequest<{ signal: AbortSignal }>();

    return request.signal;
  },
);

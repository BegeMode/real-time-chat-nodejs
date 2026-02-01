import { IJwtPayload } from '@app-types/jwt-payload.js';
import { AuthService } from '@auth/auth.service.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface IJwtRefreshPayload extends IJwtPayload {
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request.cookies.refreshToken as string | null;
        },
      ]),
      ignoreExpiration: false,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: IJwtPayload,
  ): Promise<IJwtRefreshPayload & { _id: string }> {
    const refreshToken = request.cookies.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      ...payload,
      _id: payload.sub,
      refreshToken,
    };
  }
}

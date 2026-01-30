import { AuthService } from '@auth/auth.service.js';
import { LoginDto } from '@auth/dto/login.dto.js';
import { RegisterDto } from '@auth/dto/register.dto.js';
import { AuthUser } from '@decorators/auth-user.decorator.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import { JwtRefreshAuthGuard } from '@guards/jwt-refresh-auth.guard.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { IAuthResponse, IUser } from '@shared/index.js';
import type { UserDocument } from '@users/models/user.js';
import { UsersService } from '@users/users.service.js';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  private logger = new Logger(AuthController.name, { timestamp: true });

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IAuthResponse> {
    const result = await this.authService.register(registerDto);

    // Set refresh token in HttpOnly cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refreshToken (it's in cookie)
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IAuthResponse> {
    const result = await this.authService.login(loginDto);

    // Set refresh token in HttpOnly cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refreshToken (it's in cookie)
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @AuthUser('_id') userId: string,
    @AuthUser('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    this.logger.debug(
      `Refreshing tokens for user: ${userId}, refreshToken: ${refreshToken}`,
    );

    return this.authService.refresh(userId, refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @AuthUser('_id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);

    // Clear refresh token cookie
    response.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@AuthUser() user: UserDocument): IUser {
    return this.usersService.toUserResponse(user);
  }
}

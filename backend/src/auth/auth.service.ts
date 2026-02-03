import type { IJwtPayload } from '@app-types/jwt-payload.js';
import type { LoginDto } from '@auth/dto/login.dto.js';
import type { RegisterDto } from '@auth/dto/register.dto.js';
import { IAuthResponseWithRefresh } from '@auth/types/auth-response-with-refresh.js';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUser } from '@shared/user.js';
import { UsersService } from '@users/users.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, {
    timestamp: true,
  });

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<IAuthResponseWithRefresh> {
    const { email, username, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create(
      email,
      username,
      hashedPassword,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user._id, hashedRefreshToken);

    this.logger.debug(`User ${user.email} registered successfully`);

    return {
      user: this.usersService.toUserResponse(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: LoginDto): Promise<IAuthResponseWithRefresh> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user._id, hashedRefreshToken);

    this.logger.debug(`User ${user.email} logged in successfully`);

    return {
      user: this.usersService.toUserResponse(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    this.logger.debug(`Refreshing tokens for userId: ${userId}`);

    const user = await this.usersService.findById(userId);

    if (!user) {
      this.logger.warn(`Refresh failed: User ${userId} not found`);
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (!user.refreshToken) {
      this.logger.warn(
        `Refresh failed: No refresh token stored for user ${userId}`,
      );
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Verify refresh token
    if (!user.refreshToken) {
      this.logger.warn(
        `Refresh failed: No refresh token stored for user ${userId}`,
      );
      throw new UnauthorizedException('Invalid or expired session');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      this.logger.warn(
        `Refresh failed: Invalid refresh token for user ${userId}`,
      );
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Generate new access token
    const payload: IJwtPayload = {
      sub: user._id,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '1h',
    });

    this.logger.debug(`Tokens successfully refreshed for user ${userId}`);

    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(userId: string): Promise<IUser | null> {
    return this.usersService.findById(userId);
  }

  private async generateTokens(
    user: IUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: IJwtPayload = {
      sub: user._id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

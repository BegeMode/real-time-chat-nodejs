import { AbortSignal } from '@decorators/abort-signal.decorator.js';
import { AuthUser } from '@decorators/auth-user.decorator.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '@users/users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private logger = new Logger(UsersController.name, { timestamp: true });

  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or email' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (username or email)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of matching users',
  })
  async search(
    @Query('q') query: string,
    @AuthUser('_id') userId: string,
    @AbortSignal() signal: AbortSignal,
  ) {
    if (!query) {
      return { success: true, data: [] };
    }

    this.logger.debug(
      `Searching for users with query: ${query}, currentUser: ${userId}`,
    );

    const users = await this.usersService.searchUsers(query, userId, signal);

    return users.map((user) => this.usersService.toUserResponse(user));
  }
}

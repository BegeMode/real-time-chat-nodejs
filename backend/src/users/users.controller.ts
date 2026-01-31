import { AuthUser } from '@decorators/auth-user.decorator.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '@users/users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private logger = new Logger(UsersController.name, { timestamp: true });

  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query('q') query: string, @AuthUser('_id') userId: string) {
    if (!query) {
      return { success: true, data: [] };
    }

    this.logger.debug(
      `Searching for users with query: ${query}, currentUser: ${userId}`,
    );

    const users = await this.usersService.searchUsers(query, userId);

    return {
      success: true,
      data: users.map((user) => this.usersService.toUserResponse(user)),
    };
  }
}

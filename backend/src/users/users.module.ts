import { Module } from '@nestjs/common';
import { UsersService } from '@users/users.service.js';

@Module({
  providers: [UsersService],
})
export class UsersModule {}

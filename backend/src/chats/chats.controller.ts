import { ChatsService } from '@chats/chats.service.js';
import { CreateChatDto } from '@chats/dto/create-chat.dto.js';
import { CreateMessageDto } from '@chats/dto/create-message.dto.js';
import { GetMessagesQueryDto } from '@chats/dto/get-messages-query.dto.js';
import { MessageDocument } from '@chats/models/message.js';
import { AuthUser } from '@decorators/auth-user.decorator.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IPaginated } from '@shared/paginated.js';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  private logger = new Logger(ChatsController.name, { timestamp: true });

  constructor(private readonly chatsService: ChatsService) {}

  /**
   * GET /chats - Get all conversations for the current user
   */
  @Get()
  async getChats(@AuthUser('_id') userId: string) {
    const chats = await this.chatsService.getChats(userId);

    this.logger.debug(
      `Found ${chats.length.toString()} chats for user: ${userId}`,
    );

    return {
      success: true,
      data: chats,
    };
  }

  /**
   * POST /chats - Get or create a conversation between users
   */
  @Post()
  async getOrCreateChat(
    @Body() createChatDto: CreateChatDto,
    @AuthUser('_id') userId: string,
  ) {
    const chat = await this.chatsService.getOrCreateChat(
      userId,
      createChatDto.userIds,
    );

    return {
      success: true,
      data: chat,
    };
  }

  /**
   * DELETE /chats/:chatId - Soft delete a chat for the current user
   */
  @Delete(':chatId')
  async deleteChat(
    @Param('chatId') chatId: string,
    @AuthUser('_id') userId: string,
  ) {
    await this.chatsService.deleteChat(userId, chatId);

    return {
      success: true,
    };
  }

  /**
   * POST /chats/messages - Create a new message
   */
  @Post('messages')
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @AuthUser('_id') userId: string,
  ) {
    const message = await this.chatsService.createMessage(
      userId,
      createMessageDto,
    );

    return {
      success: true,
      data: message,
    };
  }

  /**
   * GET /chats/messages/:chatId - Get paginated messages for a conversation
   */
  @Get('messages/:chatId')
  async getMessages(
    @Param('chatId') chatId: string,
    @Query() query: GetMessagesQueryDto,
    @AuthUser('_id') userId: string,
  ): Promise<{ success: boolean; data: IPaginated<MessageDocument> }> {
    const result = await this.chatsService.getMessages(userId, chatId, query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * DELETE /chats/messages/:messageId - Delete a message
   */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Query('forEveryone') forEveryone: string,
    @AuthUser('_id') userId: string,
  ) {
    const isForEveryone = forEveryone === 'true';
    await this.chatsService.deleteMessage(userId, messageId, isForEveryone);

    return {
      success: true,
    };
  }
}

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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IPaginated } from '@shared/paginated.js';

@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  private logger = new Logger(ChatsController.name, { timestamp: true });

  constructor(private readonly chatsService: ChatsService) {}

  /**
   * GET /chats - Get all conversations for the current user
   */
  @Get()
  @ApiOperation({ summary: 'Get all chats for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all chats for the authenticated user',
  })
  async getChats(@AuthUser('_id') userId: string) {
    const chats = await this.chatsService.getChats(userId);

    this.logger.debug(
      `Found ${chats.length.toString()} chats for user: ${userId}`,
    );

    return chats;
  }

  /**
   * POST /chats - Get or create a conversation between users
   */
  @Post()
  @ApiOperation({ summary: 'Get or create a chat with specified users' })
  @ApiBody({ type: CreateChatDto })
  @ApiResponse({
    status: 201,
    description: 'Chat created or retrieved successfully',
  })
  async getOrCreateChat(
    @Body() createChatDto: CreateChatDto,
    @AuthUser('_id') userId: string,
  ) {
    return this.chatsService.getOrCreateChat(userId, createChatDto.userIds);
  }

  /**
   * DELETE /chats/:chatId - Soft delete a chat for the current user
   */
  @Delete(':chatId')
  @ApiOperation({ summary: 'Delete a chat for the current user' })
  @ApiParam({ name: 'chatId', description: 'Chat ID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Chat deleted successfully',
  })
  async deleteChat(
    @Param('chatId') chatId: string,
    @AuthUser('_id') userId: string,
  ) {
    await this.chatsService.deleteChat(userId, chatId);
  }

  /**
   * POST /chats/messages - Create a new message
   */
  @Post('messages')
  @ApiOperation({ summary: 'Create a new message in a chat' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
  })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @AuthUser('_id') userId: string,
  ) {
    return this.chatsService.createMessage(userId, createMessageDto);
  }

  /**
   * GET /chats/messages/:chatId - Get paginated messages for a conversation
   */
  @Get('messages/:chatId')
  @ApiOperation({ summary: 'Get paginated messages for a chat' })
  @ApiParam({ name: 'chatId', description: 'Chat ID to get messages from' })
  @ApiQuery({ type: GetMessagesQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated messages for the chat',
  })
  async getMessages(
    @Param('chatId') chatId: string,
    @Query() query: GetMessagesQueryDto,
    @AuthUser('_id') userId: string,
  ): Promise<IPaginated<MessageDocument>> {
    return this.chatsService.getMessages(userId, chatId, query);
  }

  /**
   * DELETE /chats/messages/:messageId - Delete a message
   */
  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID to delete' })
  @ApiQuery({
    name: 'forEveryone',
    required: false,
    description: 'Delete for everyone (true) or just for current user (false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
  })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Query('forEveryone') forEveryone: string,
    @AuthUser('_id') userId: string,
  ) {
    const isForEveryone = forEveryone === 'true';
    await this.chatsService.deleteMessage(userId, messageId, isForEveryone);
  }
}

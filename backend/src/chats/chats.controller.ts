import { ChatsService } from '@chats/chats.service.js';
import { CreateChatDto } from '@chats/dto/create-chat.dto.js';
import { CreateMessageDto } from '@chats/dto/create-message.dto.js';
import { GetMessagesQueryDto } from '@chats/dto/get-messages-query.dto.js';
import { MessageDocument } from '@chats/models/message.js';
import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IPaginatedMessages } from '@shared/paginatedMessages.js';
import { Request } from 'express';

interface IAuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * GET /chats - Get all conversations for the current user
   */
  @Get()
  async getChats(@Req() req: IAuthenticatedRequest) {
    const chats = await this.chatsService.getChats(req.user.userId);

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
    @Req() req: IAuthenticatedRequest,
  ) {
    const chat = await this.chatsService.getOrCreateChat(
      req.user.userId,
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
    @Req() req: IAuthenticatedRequest,
  ) {
    await this.chatsService.deleteChat(req.user.userId, chatId);

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
    @Req() req: IAuthenticatedRequest,
  ) {
    const message = await this.chatsService.createMessage(
      req.user.userId,
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
    @Req() req: IAuthenticatedRequest,
  ): Promise<{ success: boolean; data: IPaginatedMessages<MessageDocument> }> {
    const result = await this.chatsService.getMessages(
      req.user.userId,
      chatId,
      query,
    );

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
    @Req() req: IAuthenticatedRequest,
  ) {
    const isForEveryone = forEveryone === 'true';
    await this.chatsService.deleteMessage(
      req.user.userId,
      messageId,
      isForEveryone,
    );

    return {
      success: true,
    };
  }
}

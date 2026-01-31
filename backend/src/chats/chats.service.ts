import { CreateMessageDto } from '@chats/dto/create-message.dto.js';
import { GetMessagesQueryDto } from '@chats/dto/get-messages-query.dto.js';
import { ChatDocument, ChatModel } from '@chats/models/chat.js';
import { MessageDocument, MessageModel } from '@chats/models/message.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  IPaginatedMessages,
  PubSubChannels,
  PubSubChatDeletedPayload,
  PubSubMessageDeletedPayload,
  PubSubNewMessagePayload,
} from '@shared/index.js';
import { PubSubService } from '@socket-gateway/pub-sub.service.js';
import { Model, Types } from 'mongoose';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name, { timestamp: true });
  constructor(
    @InjectModel(MessageModel.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(ChatModel.name)
    private readonly chatModel: Model<ChatDocument>,
    private readonly pubSubService: PubSubService,
  ) {}

  /**
   * Create a new message and publish to Redis for real-time delivery
   */
  async createMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageDocument> {
    const { chatId, text } = createMessageDto;

    // Validate conversation exists and user is participant
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const senderObjectId = new Types.ObjectId(senderId);
    const isParticipant = chat.members.some(
      (p) => p.user.toString() === senderId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    // Create message
    const message = await this.messageModel.create({
      chatId: new Types.ObjectId(chatId),
      senderId: senderObjectId,
      text: text.trim(),
      members: chat.members,
    });

    // Update conversation's lastMessage
    await this.chatModel.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    this.logger.log(
      `Message created: ${message._id.toString()} in chat ${chatId}`,
    );

    // Publish to Pub/Sub for Gateway to broadcast
    const pubSubPayload: PubSubNewMessagePayload = {
      chatId,
      messageId: message._id.toString(),
      senderId,
      receiverIds: chat.members.map((p) => p.user.toString()),
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    };

    await this.pubSubService.publish(PubSubChannels.NEW_MESSAGE, pubSubPayload);

    return message;
  }

  /**
   * Get paginated messages for a conversation
   */
  async getMessages(
    userId: string,
    chatId: string,
    query: GetMessagesQueryDto,
  ): Promise<IPaginatedMessages<MessageDocument>> {
    // Validate conversation and user access
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isParticipant = chat.members.some(
      (p) => p.user.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    const { limit = 50, page = 1, before } = query;
    const skip = (page - 1) * limit;

    // Build query
    const messageQuery: Record<string, unknown> = {
      chatId: new Types.ObjectId(chatId),
      members: {
        $elemMatch: {
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
    };

    // Cursor-based pagination (if before ID provided)
    if (before) {
      const beforeMessage = await this.messageModel.findById(before);

      if (beforeMessage) {
        messageQuery.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // Get messages
    const [messages, total] = await Promise.all([
      this.messageModel
        // eslint-disable-next-line unicorn/no-array-callback-reference
        .find(messageQuery)
        // eslint-disable-next-line unicorn/no-array-sort
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username avatar'),
      this.messageModel.countDocuments({
        chatId: new Types.ObjectId(chatId),
      }),
    ]);

    return {
      // eslint-disable-next-line n/no-unsupported-features/es-syntax
      messages: messages.toReversed(), // Return in chronological order
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateChat(
    userId: string,
    otherUserIds: string[],
  ): Promise<ChatDocument> {
    const participantIds = [...new Set([userId, ...otherUserIds])];

    if (participantIds.length < 2) {
      throw new BadRequestException('A chat must have at least 2 participants');
    }

    const allMemberIds = participantIds.map((id) => new Types.ObjectId(id));

    // Check if conversation already exists with EXACTLY these members
    const existingChat = await this.chatModel.findOne({
      members: { $size: allMemberIds.length },
      'members.user': { $all: allMemberIds },
    });

    if (existingChat) {
      return existingChat;
    }

    // Create new conversation
    const chat = await this.chatModel.create({
      members: allMemberIds.map((memberId) => ({
        user: memberId,
        unreadCount: 0,
        deletedAt: null,
      })),
      createdBy: new Types.ObjectId(userId),
    });

    this.logger.log(`Chat created: ${chat._id.toString()}`);

    return chat;
  }

  /**
   * Get all conversations for a user
   */
  async getChats(userId: string): Promise<ChatDocument[]> {
    return (
      this.chatModel
        .find({
          members: {
            $elemMatch: {
              user: new Types.ObjectId(userId),
              deletedAt: null,
            },
          },
        })
        .populate('members.user', 'username email avatar')
        .populate('lastMessage')
        // eslint-disable-next-line unicorn/no-array-sort
        .sort({ updatedAt: -1 })
    );
  }
  /**
   * Delete a message.
   * If forEveryone is true, the message is deleted from the DB.
   * If false, it's only marked as deleted for the current user.
   */
  async deleteMessage(
    userId: string,
    messageId: string,
    forEveryone: boolean,
  ): Promise<void> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const chatId = message.chatId.toString();

    if (forEveryone) {
      // Typically only sender can delete for everyone
      if (message.senderId.toString() !== userId) {
        throw new ForbiddenException(
          'Only the sender can delete a message for everyone',
        );
      }

      await this.messageModel.findByIdAndDelete(messageId);

      // If this was the last message, update the chat's lastMessage
      const chat = await this.chatModel.findById(chatId);

      if (chat?.lastMessage?.toString() === messageId) {
        const lastMsg = await this.messageModel
          .findOne({ chatId: new Types.ObjectId(chatId) })
          // eslint-disable-next-line unicorn/no-array-sort
          .sort({ createdAt: -1 });

        await this.chatModel.findByIdAndUpdate(chatId, {
          lastMessage: lastMsg ? lastMsg._id : null,
        });
      }

      // Publish to Pub/Sub to notify others
      if (chat) {
        const pubSubPayload: PubSubMessageDeletedPayload = {
          messageId,
          chatId,
          forEveryone: true,
          receiverIds: chat.members.map((m) => m.user.toString()),
        };

        await this.pubSubService.publish(
          PubSubChannels.MESSAGE_DELETED,
          pubSubPayload,
        );
      }
    } else {
      // Delete only for the current user
      const result = await this.messageModel.updateOne(
        {
          _id: new Types.ObjectId(messageId),
          'members.user': new Types.ObjectId(userId),
        },
        { $set: { 'members.$.deletedAt': new Date() } },
      );

      if (result.matchedCount === 0) {
        throw new BadRequestException('User is not a participant of this chat');
      }

      // Publish to Pub/Sub (to notify user's other devices/sessions)
      const pubSubPayload: PubSubMessageDeletedPayload = {
        messageId,
        chatId,
        userId,
        forEveryone: false,
        receiverIds: [userId], // Only for this specific user
      };

      await this.pubSubService.publish(
        PubSubChannels.MESSAGE_DELETED,
        pubSubPayload,
      );
    }
  }

  /**
   * Delete a chat for a specific user (soft delete).
   */
  async deleteChat(userId: string, chatId: string): Promise<void> {
    const result = await this.chatModel.updateOne(
      {
        _id: new Types.ObjectId(chatId),
        'members.user': new Types.ObjectId(userId),
      },
      { $set: { 'members.$.deletedAt': new Date() } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(
        'Chat not found or user is not a participant',
      );
    }

    // Publish to Pub/Sub
    const pubSubPayload: PubSubChatDeletedPayload = {
      chatId,
      userId,
      receiverIds: [userId],
    };

    await this.pubSubService.publish(
      PubSubChannels.CHAT_DELETED,
      pubSubPayload,
    );
  }
}

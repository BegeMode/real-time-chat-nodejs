import { CreateMessageDto } from '@chats/dto/create-message.dto.js';
import { GetMessagesQueryDto } from '@chats/dto/get-messages-query.dto.js';
import { ChatDocument } from '@chats/models/chat.js';
import { MessageDocument } from '@chats/models/message.js';
import {
  InternalEvents,
  type ISocketTypingPayload,
} from '@constants/internal-events.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import {
  IChat,
  IMessage,
  IPaginated,
  IUser,
  PubSubChannels,
  PubSubChatCreatedPayload,
  PubSubChatDeletedPayload,
  PubSubMessageDeletedPayload,
  PubSubNewMessagePayload,
  PubSubUserTypingPayload,
} from '@shared/index.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Model, Types } from 'mongoose';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name, { timestamp: true });
  constructor(
    @InjectModel('Message')
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel('Chat')
    private readonly chatModel: Model<ChatDocument>,
    private readonly pubSubService: PubSubService,
  ) {}

  /**
   * Create a new message and publish to Redis for real-time delivery
   */
  async createMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<IMessage<IUser>> {
    const { chatId, text } = createMessageDto;

    // Validate conversation exists and user is participant
    const chat = await this.chatModel.findById(chatId).lean().exec();

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

    // Fetch the created message with populated sender info using .lean()
    const result = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'username avatar email')
      .lean<IMessage<IUser>>()
      .exec();

    if (!result) {
      throw new InternalServerErrorException(
        'Failed to fetch message after creation',
      );
    }

    // Publish to Pub/Sub for Gateway to broadcast
    const pubSubPayload: PubSubNewMessagePayload = {
      chatId,
      messageId: result._id,
      senderId,
      receiverIds: chat.members.map((p) => p.user.toString()),
      text: result.text,
      createdAt: new Date(result.createdAt).toISOString(),
    };

    await this.pubSubService.publish(PubSubChannels.NEW_MESSAGE, pubSubPayload);

    return result;
  }

  /**
   * Get paginated messages for a conversation
   */
  async getMessages(
    userId: string,
    chatId: string,
    query: GetMessagesQueryDto,
  ): Promise<IPaginated<IMessage<IUser>>> {
    // Validate conversation and user access
    const chat = await this.chatModel.findById(chatId).lean().exec();

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isParticipant = chat.members.some(
      (p) => p.user.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    const { limit = 50, before } = query;

    // Build base query (messages accessible to user)
    const messageQuery: Record<string, unknown> = {
      chatId: new Types.ObjectId(chatId),
      members: {
        $elemMatch: {
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
    };

    // Calculate total messages available to this user (for UI)
    const total = await this.messageModel.countDocuments(messageQuery);

    // Filter for cursor-based pagination
    if (before) {
      const beforeMessage = await this.messageModel
        .findById(before)
        .lean()
        .exec();

      if (beforeMessage) {
        messageQuery.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // Get messages (limit + 1 to determine hasMore)
    const messages = await this.messageModel
      // eslint-disable-next-line unicorn/no-array-callback-reference
      .find(messageQuery)
      // eslint-disable-next-line unicorn/no-array-sort
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('senderId', 'username avatar')
      .lean<IMessage<IUser>[]>();

    const hasMore = messages.length > limit;
    const items = messages;

    if (hasMore) {
      items.pop();
    }

    return {
      // eslint-disable-next-line n/no-unsupported-features/es-syntax
      items: items.toReversed(), // Return in chronological order
      total,
      page: 1, // Not used for cursor pagination
      limit,
      hasMore,
    };
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateChat(
    userId: string,
    otherUserIds: string[],
  ): Promise<IChat<IUser>> {
    const participantIds = [...new Set([userId, ...otherUserIds])];

    if (participantIds.length < 2) {
      throw new BadRequestException('A chat must have at least 2 participants');
    }

    const allMemberIds = participantIds.map((id) => new Types.ObjectId(id));

    // Check if conversation already exists with EXACTLY these members
    const existingChat = await this.chatModel
      .findOne({
        members: { $size: allMemberIds.length },
        'members.user': { $all: allMemberIds },
      })
      .populate('members.user', 'username email avatar')
      .lean<IChat<IUser>>();

    if (existingChat) {
      const onlineIds = await this.pubSubService.getOnlineUserIds();
      const onlineIdsSet = new Set(onlineIds);

      existingChat.members = existingChat.members.map((m) => {
        const u = m.user;

        if (typeof u !== 'string') {
          // u is Mongoose Document
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
          u.isOnline = onlineIdsSet.has(u._id.toString());
        }

        return m;
      });

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

    const populatedChat = await this.chatModel
      .findById(chat._id)
      .populate('members.user', 'username email avatar')
      .lean<IChat<IUser>>()
      .exec();

    if (!populatedChat) {
      throw new InternalServerErrorException(
        'Failed to fetch chat after creation',
      );
    }

    const onlineIds = await this.pubSubService.getOnlineUserIds();
    const onlineIdsSet = new Set(onlineIds);

    populatedChat.members = populatedChat.members.map((m) => {
      const u = m.user;

      if (typeof u !== 'string') {
        // u is Mongoose Document
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
        u.isOnline = onlineIdsSet.has(u._id.toString());
      }

      return m;
    });

    // Publish to Pub/Sub to notify other participants
    const pubSubPayload: PubSubChatCreatedPayload = {
      chat: populatedChat,
      receiverIds: populatedChat.members.map((m) =>
        typeof m.user === 'string' ? m.user : m.user._id,
      ),
    };

    await this.pubSubService.publish(
      PubSubChannels.CHAT_CREATED,
      pubSubPayload,
    );

    return populatedChat;
  }

  /**
   * Get all conversations for a user
   */
  async getChats(userId: string): Promise<IChat<IUser>[]> {
    const chats = await this.chatModel
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
      .lean<IChat<IUser>[]>();

    const onlineIds = await this.pubSubService.getOnlineUserIds();
    const onlineIdsSet = new Set(onlineIds);

    return chats.map((chat) => {
      chat.members = chat.members.map((m) => {
        const u = m.user;

        if (typeof u !== 'string') {
          // u is Mongoose Document
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
          u.isOnline = onlineIdsSet.has(u._id.toString());
        }

        return m;
      });

      return chat;
    });
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
    const message = await this.messageModel.findById(messageId).lean().exec();

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
      const chat = await this.chatModel.findById(chatId).lean().exec();

      if (chat?.lastMessage?.toString() === messageId) {
        const lastMsg = await this.messageModel
          .findOne({ chatId: new Types.ObjectId(chatId) })
          // eslint-disable-next-line unicorn/no-array-sort
          .sort({ createdAt: -1 })
          .lean()
          .exec();

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

  /**
   * Handle user typing status
   */
  @OnEvent(InternalEvents.SOCKET_TYPING)
  async handleTypingEvent(payload: ISocketTypingPayload): Promise<void> {
    const { userId, chatId, isTyping } = payload;
    await this.handleTyping(userId, chatId, isTyping);
  }

  async handleTyping(
    userId: string,
    chatId: string,
    isTyping: boolean,
  ): Promise<void> {
    const chat = await this.chatModel.findById(chatId).lean().exec();

    if (!chat) {
      return;
    }

    const isParticipant = chat.members.some(
      (p) => p.user.toString() === userId,
    );

    if (!isParticipant) {
      return;
    }

    const pubSubPayload: PubSubUserTypingPayload = {
      userId,
      chatId,
      isTyping,
      receiverIds: chat.members.map((p) => p.user.toString()),
    };

    await this.pubSubService.publish(PubSubChannels.USER_TYPING, pubSubPayload);
  }

  /**
   * Get all user IDs who have a chat with the specified user.
   */
  async getChatPartnerIds(userId: string): Promise<string[]> {
    const chats = await this.chatModel
      .find({
        members: {
          $elemMatch: {
            user: new Types.ObjectId(userId),
            deletedAt: null,
          },
        },
      })
      .lean()
      .exec();

    const partnerIds = new Set<string>();

    for (const chat of chats) {
      for (const member of chat.members) {
        const memberId = member.user.toString();

        // Only include partners who have not deleted the chat
        if (memberId !== userId && member.deletedAt === null) {
          partnerIds.add(memberId);
        }
      }
    }

    return [...partnerIds];
  }
}

import * as fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ChatsService } from '@chats/chats.service.js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  IStory,
  IUser,
  PubSubChannels,
  PubSubNewStoryPayload,
} from '@shared/index.js';
import { IUserStories } from '@shared/story.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Story, StoryDocument } from '@stories/models/story.js';
import { Model, Types } from 'mongoose';

@Injectable()
export class StoriesService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads', 'stories');

  constructor(
    @InjectModel(Story.name) private storyModel: Model<StoryDocument>,
    private readonly chatsService: ChatsService,
    private readonly pubSubService: PubSubService,
  ) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async create(
    userId: string,
    file: Express.Multer.File,
    duration: number,
  ): Promise<IStory<IUser>> {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const fileName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(this.uploadPath, fileName);

    await writeFile(filePath, file.buffer);

    const videoUrl = `/uploads/stories/${fileName}`;

    const newStory = new this.storyModel({
      user: new Types.ObjectId(userId),
      videoUrl,
      duration,
    });

    const story = await newStory.save();

    // Fetch result with populated user using .lean() for performance and clean types
    const result = await this.storyModel
      .findById(story._id)
      .populate('user', 'username avatar email')
      .lean<IStory<IUser>>()
      .exec();

    if (!result) {
      throw new Error('Failed to create story with user info');
    }

    // Notify users who have a chat with this user
    const receiverIds = await this.chatsService.getChatPartnerIds(userId);

    const pubSubPayload: PubSubNewStoryPayload = {
      userId,
      story: result,
      receiverIds,
    };

    await this.pubSubService.publish(PubSubChannels.NEW_STORY, pubSubPayload);

    return result;
  }

  async findAllGroupedByUser(currentUserId: string): Promise<IUserStories[]> {
    const partnerIds = await this.chatsService.getChatPartnerIds(currentUserId);
    const allowedUserIds = [...partnerIds, currentUserId].map(
      (id) => new Types.ObjectId(id),
    );

    const stories = await this.storyModel
      .find({ user: { $in: allowedUserIds } })
      .populate('user', 'username avatar email')
      // eslint-disable-next-line unicorn/no-array-sort
      .sort({ createdAt: -1 })
      .lean<IStory<IUser>[]>()
      .exec();

    const grouped = new Map<string, IUserStories>();

    for (const story of stories) {
      const user = story.user;

      if (typeof user === 'string') {
        continue; // Should not happen with populate
      }

      const userId = user._id;

      if (!grouped.has(userId)) {
        grouped.set(userId, {
          user,
          stories: [],
          hasUnseen: true,
        });
      }

      const userGroup = grouped.get(userId);

      if (userGroup) {
        // Group stories by user, maintaining original field structure
        // We cast back to string for the 'user' field in IStory if needed by the frontend format
        userGroup.stories.unshift({
          ...story,
          user: userId,
        });
      }
    }

    return [...grouped.values()];
  }
}

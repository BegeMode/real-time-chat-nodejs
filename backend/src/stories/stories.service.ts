import * as fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ChatsService } from '@chats/chats.service.js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  IStory,
  PubSubChannels,
  PubSubNewStoryPayload,
} from '@shared/index.js';
import { IUserStories } from '@shared/story.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Story, StoryDocument } from '@stories/models/story.js';
import { UserDocument } from '@users/models/user.js';
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
  ): Promise<IStory> {
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

    // Populate user info for the notification
    const storyWithUser = await this.storyModel
      .findById(story._id)
      .populate('user', 'username avatar')
      .exec();

    if (!storyWithUser) {
      throw new Error('Failed to create story with user info');
    }

    // Notify users who have a chat with this user
    const receiverIds = await this.chatsService.getChatPartnerIds(userId);
    const user = storyWithUser.user as unknown as UserDocument;

    const storyPayload: IStory = {
      _id: story._id.toString(),
      user: {
        _id: userId,
        username: user.username,
        avatar: user.avatar,
        email: '', // Not used in frontend stories
      },
      videoUrl: story.videoUrl,
      duration: story.duration,
      createdAt: story.createdAt,
    };

    const pubSubPayload: PubSubNewStoryPayload = {
      userId,
      story: storyPayload,
      receiverIds,
    };

    await this.pubSubService.publish(PubSubChannels.NEW_STORY, pubSubPayload);

    return storyPayload;
  }

  async findAllGroupedByUser(currentUserId: string): Promise<IUserStories[]> {
    const partnerIds = await this.chatsService.getChatPartnerIds(currentUserId);
    const allowedUserIds = [...partnerIds, currentUserId].map(
      (id) => new Types.ObjectId(id),
    );

    const stories = await this.storyModel
      .find({ user: { $in: allowedUserIds } })
      .populate('user', 'username avatar')
      // eslint-disable-next-line unicorn/no-array-sort
      .sort({ createdAt: -1 })
      .exec();

    const grouped = new Map<string, IUserStories>();

    // eslint-disable-next-line unicorn/no-array-for-each
    stories.forEach((story: StoryDocument) => {
      const user = story.user as unknown as UserDocument;

      if (user instanceof Types.ObjectId) {
        return;
      }

      const userId = user._id.toString();

      if (!grouped.has(userId)) {
        grouped.set(userId, {
          user: {
            _id: userId,
            username: user.username,
            avatar: user.avatar,
            email: '', // Not needed for stories
            isOnline: false, // Will be updated by presence logic if needed
          },
          stories: [],
          hasUnseen: true, // For now, we'll mark as unseen
        });
      }

      const userGroup = grouped.get(userId);

      if (userGroup) {
        // Oldest story is first
        userGroup.stories.unshift({
          _id: story._id.toString(),
          user: userId,
          videoUrl: story.videoUrl,
          duration: story.duration,
          createdAt: story.createdAt,
        });
      }
    });

    return [...grouped.values()];
  }
}

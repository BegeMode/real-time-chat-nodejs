import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { IUser } from '@shared/index.js';
import type { UserDocument } from '@users/models/user.js';
import { User } from '@users/models/user.js';
import type { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    email: string,
    username: string,
    hashedPassword: string,
  ): Promise<IUser> {
    const newUser = new this.userModel({
      email,
      username,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    const result = await this.userModel
      .findById(savedUser._id)
      .lean<IUser>()
      .exec();

    if (!result) {
      throw new Error('Failed to fetch user after creation');
    }

    return result;
  }

  async findByEmail(
    email: string,
  ): Promise<(IUser & { password?: string }) | null> {
    return this.userModel
      .findOne({ email })
      .lean<IUser & { password?: string }>()
      .exec();
  }

  async findById(
    id: string,
  ): Promise<(IUser & { refreshToken?: string | null }) | null> {
    return this.userModel
      .findById(id)
      .lean<IUser & { refreshToken?: string | null }>()
      .exec();
  }

  async findAll(): Promise<IUser[]> {
    return this.userModel
      .find()
      .select('-password -refreshToken')
      .lean<IUser[]>()
      .exec();
  }

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    return this.userModel
      .find({
        _id: { $ne: excludeUserId },
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(10)
      .select('-password -refreshToken')
      .lean<IUser[]>()
      .exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken }).exec();
  }

  // Convert Mongoose document or lean object to plain IUser object (without sensitive data)
  toUserResponse(user: IUser): IUser {
    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}

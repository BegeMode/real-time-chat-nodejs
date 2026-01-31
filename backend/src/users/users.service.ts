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
  ): Promise<UserDocument> {
    const newUser = new this.userModel({
      email,
      username,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password -refreshToken').exec();
  }

  async searchUsers(
    query: string,
    excludeUserId: string,
  ): Promise<UserDocument[]> {
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
      .exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  // Convert Mongoose document to plain IUser object (without sensitive data)
  toUserResponse(user: UserDocument): IUser {
    return {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}

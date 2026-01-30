import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: '' })
  avatar!: string;

  @Prop({ type: String, default: null })
  refreshToken!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, type: String })
  email!: string;

  @Prop({ required: true, unique: true, type: String })
  username!: string;

  @Prop({ required: true, type: String })
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

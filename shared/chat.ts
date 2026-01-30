import type { IMessage } from "@shared/message";

export interface IChat {
  _id: string;
  participants: string[];
  lastMessage?: IMessage;
  updatedAt: Date;
}

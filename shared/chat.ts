import type { IMessage } from "@shared/message";
import { IChatMember } from "@shared/chatMember";

export interface IChat<T = string> {
  _id: string;
  members: IChatMember<T>[];
  lastMessage?: IMessage<T>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

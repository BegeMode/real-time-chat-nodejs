import type { IMessage } from "./message.js";
import { IChatMember } from "./chatMember.js";

export interface IChat<T = string> {
  _id: string;
  members: IChatMember<T>[];
  lastMessage?: IMessage<T>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

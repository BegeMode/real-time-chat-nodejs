import type { IMessage } from "@shared/message";
import { IChatMember } from "@shared/chatMember";

export interface IChat {
  _id: string;
  members: IChatMember[];
  lastMessage?: IMessage;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

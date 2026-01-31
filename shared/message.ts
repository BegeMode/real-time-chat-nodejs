export interface IMessage<T = string> {
  _id: string;
  chatId: string;
  senderId: T;
  text: string;
  createdAt: Date;
}

export interface IMessage {
  _id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

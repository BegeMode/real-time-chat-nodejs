export interface IUser {
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  isOnline?: boolean;
  createdAt?: Date;
}

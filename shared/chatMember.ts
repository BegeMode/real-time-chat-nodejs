export interface IChatMember<T = string> {
  user: T;
  deletedAt?: Date;
  unreadCount?: number;
}

export interface IPaginatedMessages<T> {
  messages: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
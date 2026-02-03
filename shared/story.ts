import { IUser } from './user.js';

export interface IStory<T = string> {
	_id: string;
	user: T;
	videoUrl: string;
	duration: number; // in seconds
	createdAt: Date | string;
}

export interface IUserStories {
	user: IUser;
	stories: IStory[];
	hasUnseen: boolean;
}

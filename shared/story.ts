import { IUser } from './user.js';

export interface IStory {
	_id: string;
	userId: string | IUser;
	videoUrl: string;
	duration: number; // in seconds, max 15
	createdAt: Date | string;
}

export interface IUserStories {
	user: IUser;
	stories: IStory[];
	hasUnseen: boolean;
}

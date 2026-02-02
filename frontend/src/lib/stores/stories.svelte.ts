import { apiClient } from '$lib/api/client';
import { toastStore } from './toasts.svelte';
import type { IStory, IUserStories } from '$lib/../../../shared/story';

class StoriesStore {
	#items = $state<IUserStories[]>([]);
	#isLoading = $state(false);
	#activeUserIndex = $state<number | null>(null);
	#activeStoryIndex = $state(0);

	get items() {
		return this.#items;
	}
	get isLoading() {
		return this.#isLoading;
	}
	get activeUserStories() {
		return this.#activeUserIndex !== null ? this.#items[this.#activeUserIndex] : null;
	}
	get activeStory() {
		const userStories = this.activeUserStories;
		return userStories ? userStories.stories[this.#activeStoryIndex] : null;
	}
	get activeStoryIndex() {
		return this.#activeStoryIndex;
	}

	async fetchStories() {
		this.#isLoading = true;
		try {
			const response = await apiClient.get<IUserStories[]>('/stories');
			this.#items = response.data;
		} catch (error) {
			console.error('Failed to fetch stories:', error);
			toastStore.error(
				'Failed to load stories: ' + (error instanceof Error ? error.message : String(error))
			);
		} finally {
			this.#isLoading = false;
		}
	}

	async uploadStory(blob: Blob, duration: number) {
		const formData = new FormData();
		formData.append('video', blob, 'story.webm');
		formData.append('duration', duration.toString());

		try {
			const response = await apiClient.post<IStory>('/stories', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});
			toastStore.success('Story uploaded successfully!');

			this.addStory(response.data);
		} catch (error) {
			console.error('Failed to upload story:', error);
			toastStore.error(
				'Failed to upload story: ' +
					((error as { response: { data: { message: string } } }).response?.data?.message ||
						(error as Error).message)
			);
			throw error;
		}
	}

	addStory(story: IStory) {
		const userId = typeof story.user === 'string' ? story.user : story.user._id;
		const userIndex = this.#items.findIndex((item) => item.user._id === userId);

		if (userIndex !== -1) {
			// Check if story already exists
			const storyExists = this.#items[userIndex].stories.some((s) => s._id === story._id);
			if (!storyExists) {
				this.#items[userIndex].stories.push(story);
				this.#items[userIndex].hasUnseen = true;
			}
		} else if (typeof story.user !== 'string') {
			// New user story group
			this.#items.push({
				user: story.user,
				stories: [story],
				hasUnseen: true
			});
		}
	}

	openStories(userIndex: number) {
		this.#activeUserIndex = userIndex;
		this.#activeStoryIndex = 0;
	}

	closeStories() {
		this.#activeUserIndex = null;
		this.#activeStoryIndex = 0;
	}

	nextStory() {
		if (this.#activeUserIndex === null) return;

		const userStories = this.#items[this.#activeUserIndex];
		if (this.#activeStoryIndex < userStories.stories.length - 1) {
			this.#activeStoryIndex++;
		} else if (this.#activeUserIndex < this.#items.length - 1) {
			this.#activeUserIndex++;
			this.#activeStoryIndex = 0;
		} else {
			this.closeStories();
		}
	}

	prevStory() {
		if (this.#activeUserIndex === null) return;

		if (this.#activeStoryIndex > 0) {
			this.#activeStoryIndex--;
		} else if (this.#activeUserIndex > 0) {
			this.#activeUserIndex--;
			this.#activeStoryIndex = this.#items[this.#activeUserIndex].stories.length - 1;
		}
	}
}

export const storiesStore = new StoriesStore();

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, ChevronRight } from './icons';
	import { storiesStore } from '$lib/stores/stories.svelte';
	import { getApiUrl } from '$lib/utils/url';

	const activeUserStories = $derived(storiesStore.activeUserStories);
	const activeStory = $derived(storiesStore.activeStory);
	const activeStoryIndex = $derived(storiesStore.activeStoryIndex);

	let videoElement: HTMLVideoElement | undefined = $state();
	let progress = $state(0);
	let animationFrame: number;

	const videoUrl = $derived(getApiUrl(activeStory?.videoUrl || ''));

	function handleClose() {
		storiesStore.closeStories();
	}

	function handleNext() {
		storiesStore.nextStory();
	}

	function handlePrev() {
		storiesStore.prevStory();
	}

	function updateProgress() {
		if (videoElement && !videoElement.paused) {
			progress = (videoElement.currentTime / videoElement.duration) * 100;
			if (progress >= 100) {
				handleNext();
			}
		}
		animationFrame = requestAnimationFrame(updateProgress);
	}

	onMount(() => {
		animationFrame = requestAnimationFrame(updateProgress);
	});

	onDestroy(() => {
		cancelAnimationFrame(animationFrame);
	});
</script>

{#if activeUserStories && activeStory}
	<div class="viewer-overlay">
		<div class="viewer-container">
			<!-- Header with progress bars -->
			<div class="viewer-header">
				<div class="progress-bars">
					{#each activeUserStories.stories as _, i}
						<div class="progress-bar-bg">
							<div 
								class="progress-bar-fill" 
								style:width={i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%'}
							></div>
						</div>
					{/each}
				</div>
				
				<div class="user-info">
					<div class="avatar">
						{activeUserStories.user.username[0].toUpperCase()}
					</div>
					<span class="username">{activeUserStories.user.username}</span>
					<button class="close-btn" onclick={handleClose}>
						<X />
					</button>
				</div>
			</div>

			<!-- Video Content -->
			<div class="content-wrapper">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoElement}
					src={videoUrl}
					autoplay
					playsinline
					class="story-video"
				></video>

				<!-- Navigation Zones -->
				<div class="nav-zone left" onclick={handlePrev} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && handlePrev()}></div>
				<div class="nav-zone right" onclick={handleNext} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && handleNext()}></div>
			</div>

			<!-- Controls (Optional, for desktop) -->
			<button class="nav-btn prev" onclick={handlePrev} aria-label="Previous story">
				<ChevronRight style="transform: rotate(180deg)" />
			</button>
			<button class="nav-btn next" onclick={handleNext} aria-label="Next story">
				<ChevronRight />
			</button>
		</div>
	</div>
{/if}

<style>
	.viewer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.95);
		z-index: var(--z-modal);
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(10px);
	}

	.viewer-container {
		position: relative;
		width: 100%;
		max-width: 450px;
		height: 90vh;
		background: #000;
		border-radius: var(--radius-xl);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.viewer-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: var(--spacing-4);
		z-index: 2;
		background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
	}

	.progress-bars {
		display: flex;
		gap: 4px;
		margin-bottom: var(--spacing-3);
	}

	.progress-bar-bg {
		flex: 1;
		height: 2px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: #fff;
		transition: width 0.1s linear;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		color: #fff;
	}

	.avatar {
		width: 32px;
		height: 32px;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
	}

	.username {
		font-weight: var(--font-weight-semibold);
		flex: 1;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 4px;
		opacity: 0.8;
		transition: opacity 0.2s;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.content-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.story-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.nav-zone {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 30%;
		cursor: pointer;
		z-index: 1;
	}

	.nav-zone.left { left: 0; }
	.nav-zone.right { right: 0; }

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		z-index: 3;
	}

	.nav-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.nav-btn.prev { left: -60px; }
	.nav-btn.next { right: -60px; }

	@media (max-width: 600px) {
		.nav-btn { display: none; }
		.viewer-container {
			height: 100vh;
			border-radius: 0;
		}
	}
</style>

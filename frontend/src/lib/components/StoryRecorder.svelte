<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Camera, X, Send } from './icons';
	import { toastStore } from '$lib/stores/toasts.svelte';

	interface Props {
		onSave: (blob: Blob, duration: number) => void;
		onCancel: () => void;
	}

	let { onSave, onCancel }: Props = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let previewElement: HTMLVideoElement | undefined = $state();
	let stream = $state<MediaStream | null>(null);
	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];
	
	let isRecording = $state(false);
	let recordingTime = $state(0);
	let recordedBlob = $state<Blob | null>(null);
	let timerInterval: ReturnType<typeof setInterval>;

	const MAX_DURATION = 15; // seconds

	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({ 
				video: { width: 1280, height: 720, facingMode: 'user' }, 
				audio: true 
			});
		} catch (err) {
			console.error('Error accessing camera:', err);
			const e = err as Error;
			if (e.name === 'NotAllowedError') {
				toastStore.error('Camera access denied. Please allow camera permissions.');
			} else if (e.name === 'NotFoundError') {
				toastStore.error('No camera found on your device.');
			} else {
				toastStore.error('Could not access camera: ' + e.message);
			}
			onCancel(); // Close the modal since we can't record
		}
	}

	function startRecording() {
		if (!stream) return;

		recordedChunks = [];
		mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });

		mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};

		mediaRecorder.onstop = () => {
			recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
		};

		mediaRecorder.start();
		isRecording = true;
		recordingTime = 0;

		timerInterval = setInterval(() => {
			recordingTime += 0.1;
			if (recordingTime >= MAX_DURATION) {
				stopRecording();
			}
		}, 100);
	}

	function stopRecording() {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			isRecording = false;
			clearInterval(timerInterval);
		}
	}

	function handleSave() {
		if (recordedBlob) {
			onSave(recordedBlob, recordingTime);
		}
	}

	function handleRetry() {
		recordedBlob = null;
		recordingTime = 0;
	}

	onMount(() => {
		if (!window.MediaRecorder) {
			toastStore.error('Your browser does not support video recording.');
			onCancel();
			return;
		}
		startCamera();
	});

	onDestroy(() => {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
		}
		if (timerInterval) clearInterval(timerInterval);
	});

	const progress = $derived((recordingTime / MAX_DURATION) * 100);

	$effect(() => {
		if (videoElement && stream) {
			videoElement.srcObject = stream;
		}
	});

	$effect(() => {
		if (recordedBlob && previewElement) {
			const url = URL.createObjectURL(recordedBlob);
			previewElement.src = url;
			return () => {
				URL.revokeObjectURL(url);
			};
		}
	});
</script>

<div class="recorder-wrapper">
	<div class="media-container">
		{#if !recordedBlob}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={videoElement}
				autoplay
				muted
				playsinline
				class="preview-video"
				class:recording={isRecording}
			></video>
		{:else}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={previewElement}
				controls
				autoplay
				loop
				class="preview-video"
			></video>
		{/if}

		{#if isRecording}
			<div class="recording-indicator">
				<span class="dot"></span>
				REC {recordingTime.toFixed(1)}s
			</div>
			
			<div class="progress-ring-container">
				<svg class="progress-ring" width="120" height="120">
					<circle
						class="progress-ring-circle-bg"
						stroke="rgba(255,255,255,0.2)"
						stroke-width="6"
						fill="transparent"
						r="50"
						cx="60"
						cy="60"
					/>
					<circle
						class="progress-ring-circle"
						stroke="var(--color-danger)"
						stroke-width="6"
						stroke-dasharray="314.159"
						stroke-dashoffset={314.159 - (progress / 100) * 314.159}
						stroke-linecap="round"
						fill="transparent"
						r="50"
						cx="60"
						cy="60"
					/>
				</svg>
			</div>
		{/if}
	</div>

	<div class="controls">
		{#if !recordedBlob}
			{#if !isRecording}
				<button class="btn btn-record" onclick={startRecording}>
					<div class="record-dot"></div>
				</button>
			{:else}
				<button class="btn btn-stop" onclick={stopRecording}>
					<div class="stop-box"></div>
				</button>
			{/if}
		{:else}
			<div class="action-buttons">
				<button class="btn btn-secondary" onclick={handleRetry}>
					<X /> Retry
				</button>
				<button class="btn btn-primary" onclick={handleSave}>
					<Send /> Share Story
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.recorder-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
		align-items: center;
		width: 100%;
	}

	.media-container {
		position: relative;
		width: 100%;
		aspect-ratio: 9/16;
		max-height: 60vh;
		background: #000;
		border-radius: var(--radius-xl);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-xl);
	}

	.preview-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.recording {
		transform: scale(1.02);
		transition: transform 0.3s ease;
	}

	.recording-indicator {
		position: absolute;
		top: var(--spacing-4);
		left: var(--spacing-4);
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		backdrop-filter: blur(4px);
	}

	.dot {
		width: 8px;
		height: 8px;
		background: var(--color-danger);
		border-radius: 50%;
		animation: blink 1s infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.progress-ring-container {
		position: absolute;
		pointer-events: none;
	}

	.progress-ring-circle {
		transition: stroke-dashoffset 0.1s linear;
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
	}

	.controls {
		padding: var(--spacing-4);
	}

	.btn {
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-2);
		font-weight: var(--font-weight-bold);
		transition: all var(--transition-base);
	}

	.btn-record {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: #fff;
		border: 4px solid var(--color-gray-200);
	}

	.record-dot {
		width: 50px;
		height: 50px;
		background: var(--color-danger);
		border-radius: 50%;
		transition: all 0.3s ease;
	}

	.btn-record:hover .record-dot {
		transform: scale(0.9);
	}

	.btn-stop {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: #fff;
		border: 4px solid var(--color-gray-200);
	}

	.stop-box {
		width: 30px;
		height: 30px;
		background: var(--color-danger);
		border-radius: 4px;
	}

	.action-buttons {
		display: flex;
		gap: var(--spacing-4);
	}

	.btn-primary {
		padding: var(--spacing-3) var(--spacing-6);
		background: var(--color-primary);
		color: #fff;
		border-radius: var(--radius-lg);
	}

	.btn-secondary {
		padding: var(--spacing-3) var(--spacing-6);
		background: var(--color-gray-100);
		color: var(--color-gray-700);
		border-radius: var(--radius-lg);
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { authApi } from '$lib/api/auth';
	import '$lib/styles/auth.css';
	import type { IRegisterDto } from '@shared/index';
	import { onMount } from 'svelte';

	// Form
	let email = $state('');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	// Validation errors
	let errors = $state<{ email?: string; username?: string; password?: string; confirm?: string }>(
		{}
	);

	// State from store - access class properties directly
	const isLoading = $derived(authStore.isLoading);
	const serverError = $derived(authStore.error);

	// Clear previous errors on mount
	onMount(() => {
		authStore.setError(null);
	});

	/**
	 * Form validation
	 */
	function validate(): boolean {
		errors = {};

		// Email validation
		if (!email.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Invalid email format';
		}

		// Username validation
		if (!username.trim()) {
			errors.username = 'Username is required';
		} else if (username.length < 3) {
			errors.username = 'Minimum 3 characters';
		} else if (username.length > 20) {
			errors.username = 'Maximum 20 characters';
		} else if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
			errors.username = 'Only Latin letters, numbers, dot and underscore';
		}

		// Password validation
		if (!password) {
			errors.password = 'Password is required';
		} else if (password.length < 8) {
			errors.password = 'Minimum 8 characters';
		}

		// Confirm password
		if (password !== confirmPassword) {
			errors.confirm = 'Passwords do not match';
		}

		return Object.keys(errors).length === 0;
	}

	/**
	 * Form submission
	 */
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!validate()) {
			return;
		}

		const data: IRegisterDto = {
			email: email.trim(),
			username: username.trim(),
			password
		};

		try {
			await authApi.register(data);
			goto('/');
		} catch {
			// Error is already handled in authApi and saved to store
		}
	}
</script>

<svelte:head>
	<title>Registration | RealTime Chat</title>
	<meta
		name="description"
		content="Create an account in RealTime Chat to communicate in real time"
	/>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>Registration</h1>
		<p class="subtitle">Create an account to start communicating</p>

		<form onsubmit={handleSubmit}>
			{#if serverError}
				<div class="error-banner">{serverError}</div>
			{/if}

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="example@mail.com"
					class:error={errors.email}
					disabled={isLoading}
				/>
				{#if errors.email}
					<span class="field-error">{errors.email}</span>
				{/if}
			</div>

			<div class="form-group">
				<label for="username">Username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					placeholder="username"
					class:error={errors.username}
					disabled={isLoading}
				/>
				{#if errors.username}
					<span class="field-error">{errors.username}</span>
				{/if}
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Minimum 6 characters"
					class:error={errors.password}
					disabled={isLoading}
				/>
				{#if errors.password}
					<span class="field-error">{errors.password}</span>
				{/if}
			</div>

			<div class="form-group">
				<label for="confirmPassword">Confirm password</label>
				<input
					type="password"
					id="confirmPassword"
					bind:value={confirmPassword}
					placeholder="Confirm password"
					class:error={errors.confirm}
					disabled={isLoading}
				/>
				{#if errors.confirm}
					<span class="field-error">{errors.confirm}</span>
				{/if}
			</div>

			<button type="submit" class="btn-primary" disabled={isLoading}>
				{#if isLoading}
					<span class="spinner"></span>
					Registering...
				{:else}
					Register
				{/if}
			</button>
		</form>

		<p class="auth-link">
			Already have an account? <a href="/login">Login</a>
		</p>
	</div>
</div>

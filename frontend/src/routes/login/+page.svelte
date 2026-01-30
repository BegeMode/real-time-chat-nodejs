<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, isAuthenticated } from '$lib/stores/auth';
	import { authApi } from '$lib/api/auth';
	import '$lib/styles/auth.css';
	import type { ILoginDto } from '@shared/index';
	import { onMount } from 'svelte';

	// Form
	let email = $state('');
	let password = $state('');

	// Validation errors
	let errors = $state<{ email?: string; password?: string }>({});

	// State from store
	let isLoading = $derived($authStore.isLoading);
	let serverError = $derived($authStore.error);

	// Redirect if already authorized
	onMount(() => {
		// Clear any previous errors
		authStore.setError(null);

		const unsubscribe = isAuthenticated.subscribe((value) => {
			if (value) {
				goto('/');
			}
		});

		return unsubscribe;
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

		// Password validation
		if (!password) {
			errors.password = 'Password is required';
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

		const data: ILoginDto = {
			email: email.trim(),
			password
		};

		try {
			await authApi.login(data);
			goto('/');
		} catch {
			// Error is already handled in authApi and saved to store
		}
	}
</script>

<svelte:head>
	<title>Login | RealTime Chat</title>
	<meta name="description" content="Login to RealTime Chat for real-time communication" />
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>Login</h1>
		<p class="subtitle">Login to your account</p>

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
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Your password"
					class:error={errors.password}
					disabled={isLoading}
				/>
				{#if errors.password}
					<span class="field-error">{errors.password}</span>
				{/if}
			</div>

			<button type="submit" class="btn-primary" disabled={isLoading}>
				{#if isLoading}
					<span class="spinner"></span>
					Login...
				{:else}
					Login
				{/if}
			</button>
		</form>

		<p class="auth-link">
			Don't have an account? <a href="/register">Register</a>
		</p>
	</div>
</div>

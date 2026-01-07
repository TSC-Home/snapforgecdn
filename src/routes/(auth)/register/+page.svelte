<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Card } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Register - SnapForgeCDN</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-gray-900">SnapForgeCDN</h1>
			<p class="text-gray-500 mt-1">
				{#if data.isFirstUser}
					Create admin account
				{:else}
					Register
				{/if}
			</p>
		</div>

		<Card>
			{#if data.isFirstUser}
				<div class="mb-4 p-3 bg-gray-100 border border-gray-200 text-gray-700 text-sm rounded-md">
					You are creating the first account. This will automatically become the admin.
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="space-y-4"
			>
				{#if form?.error}
					<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
						{form.error}
					</div>
				{/if}

				<Input
					name="email"
					type="email"
					label="Email"
					placeholder="mail@example.com"
					value={form?.email ?? ''}
					required
					autocomplete="email"
				/>

				<Input
					name="password"
					type="password"
					label="Password"
					placeholder="At least 8 characters"
					required
					autocomplete="new-password"
				/>

				<Input
					name="confirmPassword"
					type="password"
					label="Confirm password"
					placeholder="Repeat password"
					required
					autocomplete="new-password"
				/>

				<Button type="submit" class="w-full" {loading}>
					{data.isFirstUser ? 'Create admin' : 'Register'}
				</Button>
			</form>

			{#if !data.isFirstUser}
				<div class="mt-4 text-center text-sm text-gray-500">
					Already registered? <a href="/login" class="text-gray-900 hover:underline">Sign in</a>
				</div>
			{/if}
		</Card>
	</div>
</div>

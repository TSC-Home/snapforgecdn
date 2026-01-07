<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Card } from '$lib/components/ui';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Login - SnapForgeCDN</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-gray-900">SnapForgeCDN</h1>
			<p class="text-gray-500 mt-1">Sign in</p>
		</div>

		<Card>
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
					placeholder="••••••••"
					required
					autocomplete="current-password"
				/>

				<Button type="submit" class="w-full" {loading}>
					Sign in
				</Button>
			</form>
		</Card>
	</div>
</div>

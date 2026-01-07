<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Card } from '$lib/components/ui';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>New Gallery - SnapForgeCDN</title>
</svelte:head>

<div class="max-w-lg">
	<div class="mb-6">
		<a href="/galleries" class="text-sm text-gray-500 hover:text-gray-700">
			← Back to Galleries
		</a>
	</div>

	<Card>
		{#snippet header()}Create New Gallery{/snippet}

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
				name="name"
				label="Name"
				placeholder="e.g. Product Photos"
				value={form?.name ?? ''}
				required
				autofocus
			/>

			<div class="flex gap-2">
				<Button type="submit" {loading}>Create</Button>
				<Button variant="ghost" href="/galleries">Cancel</Button>
			</div>
		</form>
	</Card>
</div>
